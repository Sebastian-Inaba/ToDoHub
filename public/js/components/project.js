import { setBreadcrumb } from "./breadcrumb.js";
import { enableDragScroll } from "./dragScroll.js";

// Global application state
const state = {
    projects: [],
    currentProject: null,
    editMode: false,
    selectedCards: new Set(),
};

// Global file input for attachments
const globalFileInput = document.createElement("input");
globalFileInput.type = "file";
globalFileInput.accept = "image/*,.pdf";
globalFileInput.style.display = "none";
document.body.appendChild(globalFileInput);

// Track pending save operations
const pendingSaves = new Set();

// Wait for all pending save operations to complete
async function waitForPendingSaves() {
    await Promise.allSettled(Array.from(pendingSaves));
}

// Handle global file input changes for attachments
globalFileInput.addEventListener("change", async function (e) {
    const files = e.target.files;
    if (!files?.length) return;

    const cardId = this.dataset.cardId;
    const sectionId = this.dataset.sectionId;
    const taskId = this.dataset.taskId;
    this.value = "";

    const taskElement = document.querySelector(
        `.task-item[data-task-id="${taskId}"]`,
    );
    let attachmentsContainer = taskElement
        ? taskElement.querySelector(".task-attachments")
        : null;

    try {
        if (attachmentsContainer) {
            attachmentsContainer.innerHTML =
                '<div class="attachment-loading">Uploading...</div>';
        }

        const response = await uploadAttachment(
            files[0],
            cardId,
            sectionId,
            taskId,
        );

        if (response.success) {
            const newAtt = response.attachment;
            try {
                const card = state.currentProject.cards.find(
                    (c) => c._id === cardId,
                );
                const section = card?.sections.find((s) => s._id === sectionId);
                const task = section?.tasks.find((t) => t._id === taskId);

                if (task) {
                    task.attachments = task.attachments || [];
                    task.attachments.push(newAtt);
                    renderTaskAttachments(task, taskElement);
                } else {
                    loadProjectFolder(state.currentProject);
                }
            } catch (err) {
                console.error("State update error after upload:", err);
                loadProjectFolder(state.currentProject);
            }
        } else {
            throw new Error(response.error || "Upload failed");
        }
    } catch (error) {
        console.error("Attachment upload failed:", error);
        if (attachmentsContainer) {
            attachmentsContainer.innerHTML = `
        <div class="attachment-error">
          ${error.message}
          <button class="retry-upload">Try Again</button>
        </div>
      `;
            attachmentsContainer
                .querySelector(".retry-upload")
                .addEventListener("click", () => {
                    if (taskElement) {
                        globalFileInput.dataset.cardId = cardId;
                        globalFileInput.dataset.sectionId = sectionId;
                        globalFileInput.dataset.taskId = taskId;
                        globalFileInput.click();
                    }
                });
        }
    } finally {
        this.value = "";
    }
});

// Upload attachment to server
async function uploadAttachment(file, cardId, sectionId, taskId) {
    if (!file) {
        throw new Error("No file selected for upload");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", state.currentProject._id);
    formData.append("cardId", cardId);
    formData.append("sectionId", sectionId);
    formData.append("taskId", taskId);

    try {
        const response = await fetch("/api/project/upload", {
            method: "POST",
            credentials: "include",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Upload failed");
        }

        return await response.json();
    } catch (error) {
        console.error("Upload error:", error);
        throw new Error(error.message || "Failed to upload attachment");
    }
}

// Generate signed URL for secure file access
async function fetchAttachmentSignedUrl(bucket, storagePath) {
    try {
        const response = await fetch(
            `/api/project/signed-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(storagePath)}`,
            {
                credentials: "include",
            },
        );

        if (!response.ok) {
            throw new Error("Failed to fetch signed URL");
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error("Error fetching signed URL:", error);
        throw error;
    }
}

// Render task attachments with thumbnails
function renderTaskAttachments(task, taskElement) {
    if (!taskElement) return;
    const container = taskElement.querySelector(".task-attachments");
    if (!container) return;

    container.innerHTML =
        task.attachments && task.attachments.length > 0
            ? task.attachments
                  .map((att) => {
                      const bucket =
                          att.type === "image"
                              ? "attachments-img"
                              : "attachments-pdf";
                      return `
          <div class="attachment-preview" 
               data-storage-path="${att.storagePath}" 
               data-bucket="${bucket}" 
               title="${att.name}">
            ${
                att.type === "image"
                    ? `<img src="" alt="${att.name}" class="attachment-thumbnail" data-storage-path="${att.storagePath}" data-bucket="${bucket}">`
                    : `<div class="pdf-preview">📄 ${att.name}</div>`
            }
          </div>
        `;
                  })
                  .join("")
            : '<div class="no-attachments">No attachments</div>';

    // Load thumbnails with fresh signed URLs
    container.querySelectorAll(".attachment-thumbnail").forEach((img) => {
        fetchAttachmentSignedUrl(img.dataset.bucket, img.dataset.storagePath)
            .then((url) => {
                img.src = url;
            })
            .catch((err) => console.error("Error loading thumbnail:", err));
    });

    // Setup click handlers for opening attachments
    container.querySelectorAll(".attachment-preview").forEach((preview) => {
        preview.addEventListener("click", async () => {
            const storagePath = preview.dataset.storagePath;
            const bucket = preview.dataset.bucket;
            try {
                const signedUrl = await fetchAttachmentSignedUrl(
                    bucket,
                    storagePath,
                );
                window.open(signedUrl, "_blank");
            } catch (err) {
                console.error("Failed to open attachment:", err);
                alert("Could not open attachment. Try again.");
            }
        });
    });
}

// Update project in global state
function updateProjectInState(updatedProject) {
    state.projects = state.projects.map((p) =>
        p._id === updatedProject._id ? updatedProject : p,
    );
    if (state.currentProject?._id === updatedProject._id) {
        state.currentProject = updatedProject;
    }
}

// Update sidebar project title
function updateSidebarProjectTitle(projectId, newTitle) {
    const button = document.querySelector(
        `.sidebarProjectBtn[data-project-id="${projectId}"]`,
    );
    if (button) {
        button.textContent = newTitle;
    }
}

// Custom confirmation dialog
function customConfirm(message) {
    return new Promise((resolve) => {
        document
            .querySelectorAll(".customConfirmOverlay")
            .forEach((el) => el.remove());
        const overlay = document.createElement("div");
        overlay.className = "customConfirmOverlay";
        overlay.style = `
      position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;
      background:rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;
    `;
        const box = document.createElement("div");
        box.style = `
      background:#fff;padding:2rem 2.5rem;border-radius:12px;box-shadow:0 4px 32px #0003;
      display:flex;flex-direction:column;align-items:center;gap:1.5rem;min-width:260px;
    `;
        box.innerHTML = `
      <div style="font-size:1.1em;text-align:center;">${message}</div>
      <div style="display:flex;gap:1.5rem;">
        <button class="confirmYes" style="padding:0.5em 1.5em;background:#e74c3c;color:#fff;border:none;border-radius:6px;font-size:1em;cursor:pointer;">Delete</button>
        <button class="confirmNo" style="padding:0.5em 1.5em;background:#eee;color:#444;border:none;border-radius:6px;font-size:1em;cursor:pointer;">Cancel</button>
      </div>
    `;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        box.querySelector(".confirmYes").onclick = () => {
            overlay.remove();
            resolve(true);
        };
        box.querySelector(".confirmNo").onclick = () => {
            overlay.remove();
            resolve(false);
        };
    });
}

// Handle "Add Project" button click
document.addEventListener("click", (e) => {
    if (e.target.closest(".addProjectButton")) {
        e.preventDefault();
        showAddProjectTemplate();
    }
});

// Show modal for adding a new project
function showAddProjectTemplate() {
    const modal = document.getElementById("addProjectModal");
    const tpl = document.getElementById("templateAddProjects");

    if (!modal || !tpl) {
        console.error("Modal or template not found");
        return;
    }

    modal.innerHTML = "";
    modal.appendChild(tpl.content.cloneNode(true));
    modal.classList.remove("hidden");
    document.body.classList.add("no-scroll");

    const form = modal.querySelector(".projectSetupForm");
    const createProjectError = modal.querySelector("#createProjectError");

    const closeModal = () => {
        modal.classList.add("hidden");
        document.body.classList.remove("no-scroll");
        modal.innerHTML = "";
    };

    modal.addEventListener("click", (e) => {
        if (
            e.target.classList.contains("modalCloseBtn") ||
            e.target.classList.contains("modalCancelBtn") ||
            e.target === modal
        ) {
            closeModal();
        }
    });

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        createProjectError.textContent = "";
        createProjectError.className = "";

        const title = form.querySelector("input").value.trim();

        if (!title || title.length > 35) {
            createProjectError.classList.add("error-text");
            createProjectError.textContent = !title
                ? "Folder name cannot be empty."
                : "Folder name must be 35 characters or fewer.";
            return;
        }

        try {
            const response = await fetch("/api/project", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });

            if (!response.ok) throw new Error("Failed to create project");

            const project = await response.json();
            createProjectError.classList.add("success-text");
            createProjectError.textContent = "Project created successfully!";

            form.reset();
            loadSidebarProjects();

            window.dispatchEvent(
                new CustomEvent("navigate", {
                    detail: { route: "Project", project },
                }),
            );

            closeModal();
        } catch (error) {
            createProjectError.classList.add("error-text");
            createProjectError.textContent =
                "Failed to create project. Please try again.";
        }
    });
}

// Load and display all projects in the sidebar
async function loadSidebarProjects() {
    try {
        const res = await fetch("/api/project", { credentials: "include" });
        const list = document.querySelector(".sidebarProjectsList");
        const projects = await res.json();
        state.projects = projects;
        list.innerHTML = "";

        projects.forEach((p) => {
            const b = document.createElement("button");
            b.className = "sidebarButton sidebarProjectBtn";
            b.textContent = p.title;
            b.dataset.projectId = p._id;
            b.addEventListener("click", () => {
                window.dispatchEvent(
                    new CustomEvent("navigate", {
                        detail: { route: "Project", project: p },
                    }),
                );
            });
            list.appendChild(b);
        });
        enableDragScroll(list);
    } catch (error) {
        console.error("Failed to load projects:", error);
    }
}

// Disable/enable card editing based on edit mode
function setCardEditingDisabled(disabled) {
    document
        .querySelectorAll(
            ".editable-card-title, .card-description, .editable-section-title, .editable-task-title, .task-description",
        )
        .forEach((el) => {
            el.contentEditable = !disabled;
        });

    document
        .querySelectorAll(".important-toggle, .task-toggle, .editable-due-date")
        .forEach((el) => {
            el.disabled = disabled;
        });

    document
        .querySelectorAll(
            ".addSectionButton, .deleteSectionButton, .addTaskButton, .deleteTaskButton",
        )
        .forEach((button) => {
            button.disabled = disabled;
            button.style.visibility = disabled ? "hidden" : "visible";
        });
}

// Load a specific project's folder view
async function loadProjectFolder(p) {
    const projectFromState = state.projects.find((proj) => proj._id === p._id);
    const project = projectFromState || p;

    if (!state.projects.some((proj) => proj._id === project._id)) {
        state.projects.push(project);
    }

    state.currentProject = project;

    const main = document.querySelector(".mainContent");
    main.innerHTML = `
    <section class="project-folder" data-id="${project._id}">
      <div class="project-header">
        <h2 class="project-title">${project.title}</h2>
        <div class="project-actions">
          <button class="addCardButton instant-add-btn">+ Add Card</button>
          <button class="editModeToggle">Edit Mode</button>
          <div class="edit-mode-controls" style="display: none;">
            <button class="selectAllCards">Select All</button>
            <button class="deleteSelectedCards">Delete Selected</button>
          </div>
        </div>
      </div>
      <div class="projectCardsContainer"></div>
    </section>
  `;

    const container = main.querySelector(".projectCardsContainer");
    container.innerHTML = "";

    // Setup edit mode controls
    const editModeToggle = main.querySelector(".editModeToggle");
    const editModeControls = main.querySelector(".edit-mode-controls");
    const selectAllBtn = main.querySelector(".selectAllCards");
    const deleteSelectedBtn = main.querySelector(".deleteSelectedCards");
    const addCardButton = main.querySelector(".addCardButton");
    const projectTitle = main.querySelector(".project-title");

    editModeToggle.addEventListener("click", () => {
        state.editMode = !state.editMode;

        if (state.editMode) {
            editModeToggle.textContent = "Cancel Edit";
            editModeControls.style.display = "flex";
            projectTitle.contentEditable = "true";
            projectTitle.classList.add("editing");
            addCardButton.style.display = "none";
            setCardEditingDisabled(true);
        } else {
            editModeToggle.textContent = "Edit Mode";
            editModeControls.style.display = "none";
            projectTitle.contentEditable = "false";
            projectTitle.classList.remove("editing");
            addCardButton.style.display = "block";
            setCardEditingDisabled(false);

            // Clear selection
            state.selectedCards.clear();
            document.querySelectorAll(".projectCardRaw").forEach((card) => {
                card.classList.remove("selected");
            });
        }
    });

    selectAllBtn.addEventListener("click", () => {
        document.querySelectorAll(".projectCardRaw").forEach((card) => {
            const cardId = card.dataset.cardId;
            state.selectedCards.add(cardId);
            card.classList.add("selected");
        });
    });

    deleteSelectedBtn.addEventListener("click", async () => {
        if (state.selectedCards.size === 0) return;

        if (
            await customConfirm(
                `Are you sure you want to delete ${state.selectedCards.size} card(s)?`,
            )
        ) {
            const deletePromises = Array.from(state.selectedCards).map(
                (cardId) =>
                    fetch(`/api/project/${project._id}/card/${cardId}`, {
                        method: "DELETE",
                        credentials: "include",
                    }),
            );

            state.selectedCards.forEach((cardId) => {
                const cardEl = document.querySelector(
                    `.projectCardRaw[data-card-id="${cardId}"]`,
                );
                if (cardEl) cardEl.remove();
                state.currentProject.cards = state.currentProject.cards.filter(
                    (c) => c._id !== cardId,
                );
            });

            updateProjectInState(state.currentProject);
            state.selectedCards.clear();

            try {
                await Promise.all(deletePromises);
            } catch (error) {
                console.error("Error deleting cards:", error);
                const projectResponse = await fetch(
                    `/api/project/${project._id}`,
                    { credentials: "include" },
                );
                if (projectResponse.ok) {
                    const project = await projectResponse.json();
                    state.currentProject = project;
                    updateProjectInState(project);
                    loadProjectFolder(project);
                }
            }
        }
    });

    projectTitle.addEventListener("blur", async () => {
        try {
            const newTitle = projectTitle.textContent;
            const originalTitle = project.title;

            projectTitle.textContent = newTitle;
            project.title = newTitle;
            updateSidebarProjectTitle(project._id, newTitle);
            setBreadcrumb([newTitle], () => {});

            const response = await fetch(`/api/project/${project._id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle }),
            });

            if (!response.ok) throw new Error("Failed to update project title");
            updateProjectInState(project);
        } catch (error) {
            console.error("Error updating project title:", error);
            projectTitle.textContent = project.title;
        }
    });

    // Add new card
    addCardButton.addEventListener("click", async () => {
        try {
            const response = await fetch(`/api/project/${project._id}/card`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `Card ${document.querySelectorAll(".projectCardRaw").length + 1}`,
                }),
            });

            if (!response.ok) throw new Error("Failed to add card");
            const card = await response.json();

            project.cards.push(card);
            updateProjectInState(project);
            loadProjectFolder(project);
        } catch (error) {
            console.error("Error adding card:", error);
        }
    });

    // Render project cards
    project.cards.forEach((card) => {
        const cardDiv = document.createElement("div");
        cardDiv.className = "projectCardRaw card-style";
        cardDiv.dataset.cardId = card._id;
        cardDiv.innerHTML = `
      <div class="card-header">
        <h3 contenteditable="true" class="editable-card-title">${card.title || "(Untitled)"}</h3>
        <div class="card-meta">
          <span class="meta-item"><strong>Created:</strong> ${card.createdAt ? new Date(card.createdAt).toLocaleString() : "(unknown)"}</span>
          <span class="meta-item"><strong>Due:</strong> 
            <input type="date" class="editable-due-date" value="${card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""}">
          </span>
          <label class="meta-item important-checkbox">
            <input type="checkbox" ${card.isImportant ? "checked" : ""} class="important-toggle">
            Important
          </label>
          <button class="addSectionButton instant-add-btn" data-card-id="${card._id}">+ Add Section</button>
        </div>
      </div>
      <div class="card-description" contenteditable="true">${card.description || "(No description)"}</div>
      <div class="card-sections"></div>
    `;

        const sectionsContainer = cardDiv.querySelector(".card-sections");

        if (card.sections && card.sections.length > 0) {
            card.sections.forEach((section) => {
                const sectionDiv = document.createElement("div");
                sectionDiv.className = "card-section section-style";
                sectionDiv.dataset.sectionId = section._id;
                sectionDiv.innerHTML = `
          <div class="section-header">
            <h4 contenteditable="true" class="editable-section-title">${section.title || "(Untitled section)"}</h4>
            <button class="addTaskButton instant-add-btn" data-card-id="${card._id}" data-section-id="${section._id}">+ Add Task</button>
            <button class="deleteSectionButton delete-btn" data-card-id="${card._id}" data-section-id="${section._id}">Delete</button>
          </div>
          <div class="section-tasks"></div>
        `;

                const tasksContainer =
                    sectionDiv.querySelector(".section-tasks");

                if (section.tasks && section.tasks.length > 0) {
                    section.tasks.forEach((task) => {
                        const taskDiv = document.createElement("div");
                        taskDiv.className = `task-item task-style ${task.isCompleted ? "completed" : ""}`;
                        taskDiv.dataset.taskId = task._id;
                        taskDiv.innerHTML = `
            <div class="task-header">
                <div class="task-checkbox-container">
                <input type="checkbox" ${task.isCompleted ? "checked" : ""} class="task-toggle">
                <h5 contenteditable="true" class="editable-task-title">${task.title || "(Untitled task)"}</h5>
                </div>
                <div class="task-actions">
                <button class="deleteTaskButton delete-btn" data-card-id="${card._id}" data-section-id="${section._id}" data-task-id="${task._id}">Delete</button>
                <button class="attachment-button" data-card-id="${card._id}" data-section-id="${section._id}" data-task-id="${task._id}">📎 Attachment</button>
                </div>
            </div>
            <div class="task-description" contenteditable="true">${task.description || "(No description)"}</div>
            ${
                task.tags && task.tags.length > 0
                    ? `<div class="task-tags">Tags: ${task.tags.join(", ")}</div>`
                    : ""
            }
            <div class="task-attachments">
                ${
                    task.attachments && task.attachments.length > 0
                        ? task.attachments
                              .map(
                                  (att) => `
                    <div class="attachment-preview" data-url="${att.url}">
                    ${
                        att.type === "image"
                            ? `<img src="${att.url}" alt="${att.name}" class="attachment-thumbnail">`
                            : `<div class="pdf-preview">📄 ${att.name}</div>`
                    }
                    </div>
                `,
                              )
                              .join("")
                        : '<div class="no-attachments">No attachments</div>'
                }
            </div>
            `;
                        tasksContainer.appendChild(taskDiv);
                    });
                } else {
                    tasksContainer.innerHTML =
                        '<div class="no-tasks">No tasks in this section</div>';
                }

                sectionsContainer.appendChild(sectionDiv);
            });
        } else {
            sectionsContainer.innerHTML =
                '<div class="no-sections">No sections in this card</div>';
        }

        container.appendChild(cardDiv);
    });

    // Setup card selection in edit mode
    document.querySelectorAll(".projectCardRaw").forEach((card) => {
        card.addEventListener("click", (e) => {
            if (!state.editMode) return;

            const cardId = card.dataset.cardId;
            if (state.selectedCards.has(cardId)) {
                state.selectedCards.delete(cardId);
                card.classList.remove("selected");
            } else {
                state.selectedCards.add(cardId);
                card.classList.add("selected");
            }
        });
    });

    addCardEventListeners(project._id);
    addBasicStyles();
    setBreadcrumb([project.title], () => {});
}

// Add event listeners to card elements
function addCardEventListeners(projectId) {
    // Important toggle handler
    document.querySelectorAll(".important-toggle").forEach((checkbox) => {
        checkbox.addEventListener("change", async (e) => {
            if (state.editMode) return;

            const cardElement = e.target.closest(".projectCardRaw");
            const cardId = cardElement.dataset.cardId;
            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const originalValue = card.isImportant;

            e.target.checked = !originalValue;
            card.isImportant = !originalValue;

            try {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isImportant: !originalValue }),
                    },
                );
                if (!response.ok)
                    throw new Error("Failed to update importance");
                updateProjectInState(state.currentProject);
            } catch (error) {
                console.error("Error updating importance:", error);
                e.target.checked = originalValue;
                card.isImportant = originalValue;
            }
        });
    });

    // Attachment button handler
    document.querySelectorAll(".attachment-button").forEach((button) => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*,.pdf";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        button.addEventListener("click", async (e) => {
            if (state.editMode) return;

            try {
                await waitForPendingSaves();
            } catch (err) {
                // ignore - we just wanted to allow saves to settle
            }

            globalFileInput.dataset.cardId = button.dataset.cardId;
            globalFileInput.dataset.sectionId = button.dataset.sectionId;
            globalFileInput.dataset.taskId = button.dataset.taskId;
            globalFileInput.click();
        });

        fileInput.addEventListener("change", async (e) => {
            if (!e.target.files?.length) return;

            const cardId = button.dataset.cardId;
            const sectionId = button.dataset.sectionId;
            const taskId = button.dataset.taskId;
            const taskItem = button.closest(".task-item");
            const attachmentsContainer =
                taskItem.querySelector(".task-attachments");

            try {
                attachmentsContainer.innerHTML =
                    '<div class="attachment-loading">Uploading...</div>';

                const response = await uploadAttachment(
                    e.target.files[0],
                    cardId,
                    sectionId,
                    taskId,
                );

                if (response.success) {
                    const newAtt = response.attachment;
                    const card = state.currentProject.cards.find(
                        (c) => c._id === cardId,
                    );
                    const section = card?.sections.find(
                        (s) => s._id === sectionId,
                    );
                    const task = section?.tasks.find((t) => t._id === taskId);

                    if (task) {
                        task.attachments = task.attachments || [];
                        task.attachments.push(newAtt);
                        renderTaskAttachments(task, taskItem);
                    } else {
                        loadProjectFolder(state.currentProject);
                    }
                } else {
                    throw new Error(response.error || "Upload failed");
                }
            } catch (error) {
                console.error("Attachment upload failed:", error);
                attachmentsContainer.innerHTML = `
          <div class="attachment-error">
            ${error.message}
            <button class="retry-upload">Try Again</button>
          </div>
        `;
                attachmentsContainer
                    .querySelector(".retry-upload")
                    .addEventListener("click", () => {
                        fileInput.value = "";
                        fileInput.click();
                    });
            } finally {
                fileInput.value = "";
            }
        });
    });

    // Attachment preview click handler
    document.querySelectorAll(".attachment-preview").forEach((preview) => {
        preview.addEventListener("click", () => {
            const url = preview.dataset.url;
            window.open(url, "_blank");
        });
    });

    // Task completion toggle handler
    document.querySelectorAll(".task-toggle").forEach((checkbox) => {
        checkbox.addEventListener("change", async (e) => {
            if (state.editMode) return;

            const taskItem = e.target.closest(".task-item");
            const cardId = taskItem.closest(".projectCardRaw").dataset.cardId;
            const sectionId =
                taskItem.closest(".card-section").dataset.sectionId;
            const taskId = taskItem.dataset.taskId;

            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const section = card.sections.find((s) => s._id === sectionId);
            const task = section.tasks.find((t) => t._id === taskId);
            const originalValue = task.isCompleted;

            e.target.checked = !originalValue;
            task.isCompleted = !originalValue;
            taskItem.classList.toggle("completed", !originalValue);

            try {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}/section/${sectionId}/task/${taskId}`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isCompleted: !originalValue }),
                    },
                );
                if (!response.ok) throw new Error("Failed to update task");
                updateProjectInState(state.currentProject);
            } catch (error) {
                console.error("Error updating task:", error);
                e.target.checked = originalValue;
                task.isCompleted = originalValue;
                taskItem.classList.toggle("completed", originalValue);
            }
        });
    });

    // Add section button handler
    document.querySelectorAll(".addSectionButton").forEach((button) => {
        button.addEventListener("click", async (e) => {
            if (state.editMode) return;

            const cardId = e.target.dataset.cardId;
            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );

            try {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}/section`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            title: `Section ${card.sections.length + 1}`,
                        }),
                    },
                );

                if (!response.ok) throw new Error("Failed to add section");
                const section = await response.json();

                card.sections.push(section);
                updateProjectInState(state.currentProject);
                loadProjectFolder(state.currentProject);
            } catch (error) {
                console.error("Error adding section:", error);
            }
        });
    });

    // Add task button handler
    document.querySelectorAll(".addTaskButton").forEach((button) => {
        button.addEventListener("click", async (e) => {
            if (state.editMode) return;

            const cardId = e.target.dataset.cardId;
            const sectionId = e.target.dataset.sectionId;

            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const section = card.sections.find((s) => s._id === sectionId);

            try {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}/section/${sectionId}/task`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            title: `Task ${section.tasks.length + 1}`,
                        }),
                    },
                );

                if (!response.ok) throw new Error("Failed to add task");
                const task = await response.json();

                section.tasks.push(task);
                updateProjectInState(state.currentProject);
                loadProjectFolder(state.currentProject);
            } catch (error) {
                console.error("Error adding task:", error);
            }
        });
    });

    // Delete section button handler
    document.querySelectorAll(".deleteSectionButton").forEach((button) => {
        button.addEventListener("click", async (e) => {
            if (state.editMode) return;

            const cardId = e.target.dataset.cardId;
            const sectionId = e.target.dataset.sectionId;
            const sectionElement = e.target.closest(".card-section");

            if (
                await customConfirm(
                    "Are you sure you want to delete this section?",
                )
            ) {
                sectionElement.remove();
                const card = state.currentProject.cards.find(
                    (c) => c._id === cardId,
                );
                card.sections = card.sections.filter(
                    (s) => s._id !== sectionId,
                );
                updateProjectInState(state.currentProject);

                try {
                    const response = await fetch(
                        `/api/project/${projectId}/card/${cardId}/section/${sectionId}`,
                        {
                            method: "DELETE",
                            credentials: "include",
                        },
                    );
                    if (!response.ok)
                        throw new Error("Failed to delete section");
                } catch (error) {
                    console.error("Error deleting section:", error);
                    const projectResponse = await fetch(
                        `/api/project/${projectId}`,
                        { credentials: "include" },
                    );
                    if (projectResponse.ok) {
                        const project = await projectResponse.json();
                        state.currentProject = project;
                        updateProjectInState(project);
                        loadProjectFolder(project);
                    }
                }
            }
        });
    });

    // Delete task button handler
    document.querySelectorAll(".deleteTaskButton").forEach((button) => {
        button.addEventListener("click", async (e) => {
            if (state.editMode) return;

            const cardId = e.target.dataset.cardId;
            const sectionId = e.target.dataset.sectionId;
            const taskId = e.target.dataset.taskId;
            const taskElement = e.target.closest(".task-item");

            if (
                await customConfirm(
                    "Are you sure you want to delete this task?",
                )
            ) {
                taskElement.remove();
                const card = state.currentProject.cards.find(
                    (c) => c._id === cardId,
                );
                const section = card.sections.find((s) => s._id === sectionId);
                section.tasks = section.tasks.filter((t) => t._id !== taskId);
                updateProjectInState(state.currentProject);

                try {
                    const response = await fetch(
                        `/api/project/${projectId}/card/${cardId}/section/${sectionId}/task/${taskId}`,
                        {
                            method: "DELETE",
                            credentials: "include",
                        },
                    );
                    if (!response.ok) throw new Error("Failed to delete task");
                } catch (error) {
                    console.error("Error deleting task:", error);
                    const projectResponse = await fetch(
                        `/api/project/${projectId}`,
                        { credentials: "include" },
                    );
                    if (projectResponse.ok) {
                        const project = await projectResponse.json();
                        state.currentProject = project;
                        updateProjectInState(project);
                        loadProjectFolder(project);
                    }
                }
            }
        });
    });

    // Editable card title handler
    document.querySelectorAll(".editable-card-title").forEach((el) => {
        el.addEventListener("blur", async (e) => {
            if (state.editMode) return;

            const cardElement = e.target.closest(".projectCardRaw");
            const cardId = cardElement.dataset.cardId;
            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const originalTitle = card ? card.title : "";
            const newTitle = e.target.textContent;

            if (card) card.title = newTitle;

            const savePromise = (async () => {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: newTitle }),
                    },
                );
                if (!response.ok)
                    throw new Error("Failed to update card title");
                updateProjectInState(state.currentProject);
            })();

            pendingSaves.add(savePromise);
            savePromise.finally(() => pendingSaves.delete(savePromise));

            try {
                await savePromise;
            } catch (error) {
                console.error("Error updating card title:", error);
                e.target.textContent = originalTitle;
                if (card) card.title = originalTitle;
            }
        });
    });

    // Card description handler
    document.querySelectorAll(".card-description").forEach((el) => {
        el.addEventListener("blur", async (e) => {
            if (state.editMode) return;

            const cardElement = e.target.closest(".projectCardRaw");
            const cardId = cardElement.dataset.cardId;
            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const originalDesc = card ? (card.description ?? "") : "";
            const newDesc = e.target.textContent;

            if (card) card.description = newDesc;

            const savePromise = (async () => {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ description: newDesc }),
                    },
                );
                if (!response.ok)
                    throw new Error("Failed to update card description");
                updateProjectInState(state.currentProject);
            })();

            pendingSaves.add(savePromise);
            savePromise.finally(() => pendingSaves.delete(savePromise));

            try {
                await savePromise;
            } catch (error) {
                console.error("Error updating card description:", error);
                e.target.textContent = originalDesc;
                if (card) card.description = originalDesc;
            }
        });
    });

    // Section title handler
    document.querySelectorAll(".editable-section-title").forEach((el) => {
        el.addEventListener("blur", async (e) => {
            if (state.editMode) return;

            const cardElement = e.target.closest(".projectCardRaw");
            const sectionElement = e.target.closest(".card-section");
            const cardId = cardElement.dataset.cardId;
            const sectionId = sectionElement.dataset.sectionId;

            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const section = card?.sections.find((s) => s._id === sectionId);
            const originalTitle = section ? (section.title ?? "") : "";
            const newTitle = e.target.textContent;

            if (section) section.title = newTitle;

            const savePromise = (async () => {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}/section/${sectionId}`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: newTitle }),
                    },
                );
                if (!response.ok)
                    throw new Error("Failed to update section title");
                updateProjectInState(state.currentProject);
            })();

            pendingSaves.add(savePromise);
            savePromise.finally(() => pendingSaves.delete(savePromise));

            try {
                await savePromise;
            } catch (error) {
                console.error("Error updating section title:", error);
                e.target.textContent = originalTitle;
                if (section) section.title = originalTitle;
            }
        });
    });

    // Task title handler
    document.querySelectorAll(".editable-task-title").forEach((el) => {
        el.addEventListener("blur", async (e) => {
            if (state.editMode) return;

            const cardElement = e.target.closest(".projectCardRaw");
            const sectionElement = e.target.closest(".card-section");
            const taskElement = e.target.closest(".task-item");
            const cardId = cardElement.dataset.cardId;
            const sectionId = sectionElement.dataset.sectionId;
            const taskId = taskElement.dataset.taskId;

            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const section = card?.sections.find((s) => s._id === sectionId);
            const task = section?.tasks.find((t) => t._id === taskId);
            const originalTitle = task ? (task.title ?? "") : "";
            const newTitle = e.target.textContent;

            if (task) task.title = newTitle;

            const savePromise = (async () => {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}/section/${sectionId}/task/${taskId}`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: newTitle }),
                    },
                );
                if (!response.ok)
                    throw new Error("Failed to update task title");
                updateProjectInState(state.currentProject);
            })();

            pendingSaves.add(savePromise);
            savePromise.finally(() => pendingSaves.delete(savePromise));

            try {
                await savePromise;
            } catch (error) {
                console.error("Error updating task title:", error);
                e.target.textContent = originalTitle;
                if (task) task.title = originalTitle;
            }
        });
    });

    // Task description handler
    document.querySelectorAll(".task-description").forEach((el) => {
        el.addEventListener("blur", async (e) => {
            if (state.editMode) return;

            const cardElement = e.target.closest(".projectCardRaw");
            const sectionElement = e.target.closest(".card-section");
            const taskElement = e.target.closest(".task-item");
            const cardId = cardElement.dataset.cardId;
            const sectionId = sectionElement.dataset.sectionId;
            const taskId = taskElement.dataset.taskId;

            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const section = card?.sections.find((s) => s._id === sectionId);
            const task = section?.tasks.find((t) => t._id === taskId);
            const originalDesc = task ? (task.description ?? "") : "";
            const newDesc = e.target.textContent;

            if (task) task.description = newDesc;

            const savePromise = (async () => {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}/section/${sectionId}/task/${taskId}`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ description: newDesc }),
                    },
                );
                if (!response.ok)
                    throw new Error("Failed to update task description");
                updateProjectInState(state.currentProject);
            })();

            pendingSaves.add(savePromise);
            savePromise.finally(() => pendingSaves.delete(savePromise));

            try {
                await savePromise;
            } catch (error) {
                console.error("Error updating task description:", error);
                e.target.textContent = originalDesc;
                if (task) task.description = originalDesc;
            }
        });
    });

    // Due date handler
    document.querySelectorAll(".editable-due-date").forEach((el) => {
        el.addEventListener("change", async (e) => {
            if (state.editMode) return;

            const cardElement = e.target.closest(".projectCardRaw");
            const cardId = cardElement.dataset.cardId;
            const card = state.currentProject.cards.find(
                (c) => c._id === cardId,
            );
            const originalDate = card ? card.dueDate : null;
            const newDate = e.target.value ? new Date(e.target.value) : null;

            if (card) card.dueDate = newDate;

            const payloadDate = newDate ? newDate.toISOString() : null;

            const savePromise = (async () => {
                const response = await fetch(
                    `/api/project/${projectId}/card/${cardId}`,
                    {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ dueDate: payloadDate }),
                    },
                );
                if (!response.ok) throw new Error("Failed to update due date");
                updateProjectInState(state.currentProject);
            })();

            pendingSaves.add(savePromise);
            savePromise.finally(() => pendingSaves.delete(savePromise));

            try {
                await savePromise;
            } catch (error) {
                console.error("Error updating due date:", error);
                e.target.value = originalDate
                    ? new Date(originalDate).toISOString().split("T")[0]
                    : "";
                if (card) card.dueDate = originalDate;
            }
        });
    });
}

// Basic CSS styles for the project interface
function addBasicStyles() {
    const style = document.createElement("style");
    style.textContent = `
    .card-style {
      background: white;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #4CAF50;
      transition: box-shadow 0.2s;
    }
    
    .section-style {
      background: #f9f9f9;
      border-radius: 6px;
      padding: 12px;
      margin: 12px 0;
      border-left: 3px solid #2196F3;
    }
    
    .task-style {
      background: #fff;
      border-radius: 4px;
      padding: 8px;
      margin: 8px 0;
      border-left: 2px solid #FFC107;
    }
    
    .task-style.completed {
      opacity: 0.7;
      text-decoration: line-through;
    }
    
    .instant-add-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
      margin: 0 4px;
    }
    
    .delete-btn {
      background: #f44336;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
      margin: 0 4px;
    }
    
    .card-header, .section-header, .task-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    h3, h4, h5 {
      margin: 0;
      flex-grow: 1;
    }
    
    .card-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.9em;
      color: #666;
    }
    
    .important-checkbox, .task-checkbox {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }
    
    button:hover {
      opacity: 0.9;
    }
    
    .task-checkbox-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .task-checkbox-container input[type="checkbox"] {
      cursor: pointer;
    }
    
    .task-checkbox-container h5 {
      cursor: text;
      margin: 0;
    }
    
    /* Edit mode styles */
    .project-title.editing {
      border: 1px dashed #ccc;
      padding: 4px;
      border-radius: 4px;
      background-color: #f9f9f9;
      outline: none;
    }
    
    .projectCardRaw.selected {
      box-shadow: 0 0 0 3px #4CAF50;
      border-radius: 8px;
    }
    
    .edit-mode-controls {
      display: flex;
      gap: 10px;
      margin-left: auto;
    }
    
    .project-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .editModeToggle {
      background: #3498db;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
    }
    
    .selectAllCards {
      background: #9b59b6;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
    }
    
    .deleteSelectedCards {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9em;
    }
      /* New attachment styles */
    .task-attachments {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    
    .attachment-preview {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      width: 100px;
      height: 100px;
      cursor: pointer;
      position: relative;
    }
    
    .attachment-thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .pdf-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: #f0f0f0;
      font-size: 0.8em;
      text-align: center;
      padding: 5px;
      overflow: hidden;
    }
    
    .task-actions {
      display: flex;
      gap: 5px;
    }
    
    .attachment-button {
      background: #e0e0e0;
      padding: 4px 8px;
      borderRadius: 4px;
      cursor: pointer;
      font-size: 0.9em;
      border: none;
    }
    
    .attachment-button:hover {
      background: #d0d0d0;
    }
    
    .attachment-loading, .attachment-error, .no-attachments {
      font-style: italic;
      color: #666;
      padding: 5px;
    }
    
    .attachment-error {
      color: #e74c3c;
    }
  `;
    document.head.appendChild(style);
}

export { showAddProjectTemplate, loadSidebarProjects, loadProjectFolder };
