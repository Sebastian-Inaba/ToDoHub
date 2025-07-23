import { setBreadcrumb } from "./breadcrumb.js";
import { enableDragScroll } from "./dragScroll.js";

// Handle click on "Add Project" button
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".addProjectButton");
    if (!btn) return;
    e.preventDefault();
    showAddProjectTemplate();
});

// Display the "Add Project" form
function showAddProjectTemplate() {
    setBreadcrumb(["Add Project"]);
    console.log("showAddProjectTemplate (modal)");

    const tpl = document.getElementById("templateAddProjects");
    const modal = document.getElementById("addProjectModal");
    if (!tpl || !modal) {
        console.error("templateAddProjects or addProjectModal not found");
        return;
    }

    // Clear previous modal content
    modal.innerHTML = "";
    modal.appendChild(tpl.content.cloneNode(true));
    modal.classList.remove("hidden");

    // Prevent background scroll
    document.body.classList.add("no-scroll");

    const form = modal.querySelector(".projectSetupForm");
    const createProjectError = modal.querySelector("#createProjectError");
    const closeBtn = modal.querySelector(".modalCloseBtn");
    const cancelBtn = modal.querySelector(".modalCancelBtn");

    function closeModal() {
        modal.classList.add("hidden");
        document.body.classList.remove("no-scroll");
        modal.innerHTML = "";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

    // Optional: close modal on overlay click
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    if (!form) {
        console.error(".projectSetupForm not found");
        return;
    }

    // Handle form submission for creating a project
    form.addEventListener("submit", async (ev) => {
        ev.preventDefault();

        createProjectError.textContent = "";
        createProjectError.style.color = "";

        const title = form.querySelector("input").value.trim();
        console.log("submit, title=", title);

        // Validation: Empty or too long
        if (!title) {
            createProjectError.style.color = "red";
            createProjectError.textContent = "Folder name cannot be empty.";
            return;
        }
        if (title.length > 35) {
            createProjectError.style.color = "red";
            createProjectError.textContent =
                "Folder name must be 35 characters or fewer.";
            return;
        }

        try {
            const res = await fetch("/api/project", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title }),
            });

            const project = await res.json();

            if (res.ok && project._id) {
                createProjectError.style.color = "green";
                createProjectError.textContent =
                    project.message || "Project created successfully!";
                form.reset();

                loadSidebarProjects();
                window.dispatchEvent(new CustomEvent("navigate", { detail: { route: "Project", project } }));
                closeModal();
            } else {
                createProjectError.style.color = "red";
                createProjectError.textContent =
                    project.error || "Could not create folder.";
            }
        } catch (err) {
            console.error("❌ create error", err);
            createProjectError.style.color = "red";
            createProjectError.textContent = "Server error. Try again later.";
        }
    });
}

// Load and display all projects in the sidebar
async function loadSidebarProjects() {
    console.log("loadSidebarProjects");
    try {
        const res = await fetch("/api/project", { credentials: "include" });
        const list = document.querySelector(".sidebarProjectsList");
        const projects = await res.json();
        list.innerHTML = "";

        projects.forEach((p) => {
            const b = document.createElement("button");
            b.className = "sidebarButton sidebarProjectBtn";
            b.textContent = p.title;
            b.addEventListener("click", () => {
                window.dispatchEvent(new CustomEvent("navigate", { detail: { route: "Project", project: p } }));
            });
            list.appendChild(b);
        });

        // Re-enable drag-to-scroll after updating the list
        enableDragScroll(list);
    } catch (e) {
        console.error(e);
    }
}

// Load a specific project's folder view
function loadProjectFolder(p) {
    console.log("loadProjectFolder", p);

    const main = document.querySelector(".mainContent");
    main.innerHTML = `
        <section class="project-folder" data-id="${p._id}">
            <h2>${p.title}</h2>
            <button class="addCardBtn">Add Project Card</button>
            <div class="projectCardsContainer"></div>
        </section>
    `;

    setBreadcrumb([p.title], (index) => {
        console.log("Breadcrumb clicked at index:", index);
    });
}

export { showAddProjectTemplate, loadSidebarProjects, loadProjectFolder };