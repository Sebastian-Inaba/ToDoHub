const mongoose = require("mongoose");
delete mongoose.connection.models["Project"];
const express = require("express");
const router = express.Router();
const Project = require("../models/project");
const { verifyToken } = require("../middleware/userVerification");
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");
const multerUpload = require("../middleware/multerConfig");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
);

const BUCKETS = {
    PDF: "attachments-pdf",
    IMAGE: "attachments-img",
};

// PDF and IMG attachment upload route
router.post(
    "/upload",
    verifyToken,
    multerUpload.single("file"),
    async (req, res) => {
        try {
            // Validate inputs
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "No file uploaded",
                });
            }

            if (
                !req.body.projectId ||
                !req.body.cardId ||
                !req.body.sectionId ||
                !req.body.taskId
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Missing required fields",
                });
            }

            const file = req.file;
            const userId = req.user.id;
            const { projectId, cardId, sectionId, taskId } = req.body;

            const isImage = file.mimetype && file.mimetype.startsWith("image/");
            const isPDF = file.mimetype === "application/pdf";

            // Choose bucket & process buffer
            let bucket, processedBuffer, fileExtension, contentType;
            if (isImage) {
                bucket = BUCKETS.IMAGE;
                processedBuffer = await sharp(file.buffer)
                    .webp({ quality: 80, lossless: false })
                    .toBuffer();
                fileExtension = "webp";
                contentType = "image/webp";
            } else if (isPDF) {
                bucket = BUCKETS.PDF;
                processedBuffer = file.buffer;
                fileExtension = "pdf";
                contentType = "application/pdf";
            } else {
                return res.status(400).json({
                    success: false,
                    error: "Unsupported file type. Only images and PDFs are allowed.",
                });
            }

            // Generate unique filename
            const randomNum = Math.floor(Math.random() * 10000);
            const fileName = `${userId}/${Date.now()}-${randomNum}.${fileExtension}`;

            // Upload to Supabase
            const { data: uploadData, error: uploadError } =
                await supabase.storage
                    .from(bucket)
                    .upload(fileName, processedBuffer, {
                        contentType,
                        cacheControl:
                            bucket === BUCKETS.IMAGE ? "3600" : "no-store",
                        upsert: false,
                    });

            if (uploadError) {
                console.error("Supabase upload error:", uploadError);
                return res.status(500).json({
                    success: false,
                    error: "File upload failed to storage",
                });
            }

            // Generate signed URL for both image and PDF (both buckets are private)
            const { data: signedUrlData, error: urlError } =
                await supabase.storage
                    .from(bucket)
                    .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7); // 7 days

            if (urlError) {
                console.error("URL generation error:", urlError);
                throw new Error("Failed to generate download URL");
            }
            const url = signedUrlData.signedUrl;

            // Save to MongoDB
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: "Project not found",
                });
            }

            const card = project.cards.id(cardId);
            if (!card) {
                return res.status(404).json({
                    success: false,
                    error: "Card not found",
                });
            }

            const section = card.sections.id(sectionId);
            if (!section) {
                return res.status(404).json({
                    success: false,
                    error: "Section not found",
                });
            }

            const task = section.tasks.id(taskId);
            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: "Task not found",
                });
            }

            // Initialize attachments array if needed
            task.attachments = task.attachments || [];

            // Add attachment to task
            const newAttachment = {
                name: file.originalname,
                url: url,
                type: bucket === BUCKETS.IMAGE ? "image" : "pdf",
                size: file.size,
                storagePath: uploadData.path,
                uploadedBy: mongoose.Types.ObjectId.createFromHexString(userId),
                uploadedAt: new Date(),
            };

            task.attachments.push(newAttachment);
            await project.save();

            return res.json({
                success: true,
                message: "File uploaded successfully",
                attachment: newAttachment,
            });
        } catch (error) {
            console.error("File upload error:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Internal server error",
            });
        }
    },
);

// Checks for the correct bucket path url
router.get("/signed-url", verifyToken, async (req, res) => {
    try {
        const { bucket, path } = req.query;

        if (!bucket || !path) {
            return res.status(400).json({
                error: "Bucket and path parameters are required",
            });
        }

        // Validate that the bucket is one of our allowed buckets
        const allowedBuckets = [BUCKETS.PDF, BUCKETS.IMAGE];
        if (!allowedBuckets.includes(bucket)) {
            return res.status(400).json({
                error: "Invalid bucket specified",
            });
        }

        // This checks if the user has any project with an attachment matching this path
        const userHasAccess = await Project.findOne({
            userId: req.user.id,
            "cards.sections.tasks.attachments.storagePath": path,
        });

        if (!userHasAccess) {
            return res.status(403).json({
                error: "Access denied to this file",
            });
        }

        // Generate a new signed URL (valid for 7 days)
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

        if (urlError) {
            console.error("URL generation error:", urlError);
            return res.status(500).json({
                error: "Failed to generate signed URL",
            });
        }

        res.json({ url: signedUrlData.signedUrl });
    } catch (error) {
        console.error("Signed URL generation error:", error);
        res.status(500).json({
            error: "Internal server error",
        });
    }
});

// Create a project
router.post("/", verifyToken, async (req, res) => {
    const { title } = req.body;
    const userId = req.user.id; // available from the middleware

    if (title.length > 35) {
        return res
            .status(400)
            .json({ error: "Project title must be 35 characters or less." });
    }

    try {
        const newProject = new Project({ title, userId });
        await newProject.save();
        res.status(201).json(newProject);
    } catch (err) {
        res.status(500).json({ error: "Failed to create project" });
    }
});

// Get all projects for logged-in user
router.get("/", verifyToken, async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.user.id });
        res.json(projects);
    } catch {
        res.status(500).json({ error: "Failed to fetch projects" });
    }
});

// Get a single project by ID for refreshed view
router.get("/:id", verifyToken, async (req, res) => {
    const projectId = req.params.id;
    try {
        const project = await Project.findOne({
            _id: projectId,
            userId: req.user.id,
        });
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch project" });
    }
});

// Get card by id
router.post("/:id/card", verifyToken, async (req, res) => {
    const projectId = req.params.id;
    const { title, description, dueDate, isImportant } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    try {
        const project = await Project.findOne({
            _id: projectId,
            userId: req.user.id,
        });
        if (!project)
            return res.status(404).json({ error: "Project not found" });

        const card = {
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            isImportant: !!isImportant,
            createdAt: new Date(),
            sections: [],
        };

        project.cards.push(card);
        await project.save();

        // Return the newly created card (last in array)
        res.status(201).json(project.cards[project.cards.length - 1]);
    } catch (err) {
        res.status(500).json({ error: "Failed to add card" });
    }
});

// Add a section to a card
router.post(
    "/:projectId/card/:cardId/section",
    verifyToken,
    async (req, res) => {
        const { projectId, cardId } = req.params;
        const { title } = req.body;
        if (!title) return res.status(400).json({ error: "Title is required" });

        try {
            const project = await Project.findOne({
                _id: projectId,
                userId: req.user.id,
            });
            if (!project)
                return res.status(404).json({ error: "Project not found" });
            const card = project.cards.id(cardId);
            if (!card) return res.status(404).json({ error: "Card not found" });

            const section = { title, tasks: [] };
            card.sections.push(section);
            await project.save();
            res.status(201).json(card.sections[card.sections.length - 1]);
        } catch (err) {
            res.status(500).json({ error: "Failed to add section" });
        }
    },
);

// Add a task to a section
router.post(
    "/:projectId/card/:cardId/section/:sectionId/task",
    verifyToken,
    async (req, res) => {
        const { projectId, cardId, sectionId } = req.params;
        const { title, description } = req.body;
        if (!title) return res.status(400).json({ error: "Title is required" });

        try {
            const project = await Project.findOne({
                _id: projectId,
                userId: req.user.id,
            });
            if (!project)
                return res.status(404).json({ error: "Project not found" });
            const card = project.cards.id(cardId);
            if (!card) return res.status(404).json({ error: "Card not found" });
            const section = card.sections.id(sectionId);
            if (!section)
                return res.status(404).json({ error: "Section not found" });

            const task = {
                title,
                description,
                isCompleted: false,
                tags: [],
                attachments: [],
            };
            section.tasks.push(task);
            await project.save();
            res.status(201).json(section.tasks[section.tasks.length - 1]);
        } catch (err) {
            res.status(500).json({ error: "Failed to add task" });
        }
    },
);

// Delete card
router.delete("/:projectId/card/:cardId", verifyToken, async (req, res) => {
    const { projectId, cardId } = req.params;
    try {
        const updated = await Project.findOneAndUpdate(
            { _id: projectId, userId: req.user.id },
            { $pull: { cards: { _id: cardId } } },
            { new: true },
        );
        if (!updated) {
            return res
                .status(404)
                .json({ error: "Project not found or card not found" });
        }
        return res.json({ success: true });
    } catch (err) {
        console.error("🔴 pull-delete-card error:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Delete section
router.delete(
    "/:projectId/card/:cardId/section/:sectionId",
    verifyToken,
    async (req, res) => {
        const { projectId, cardId, sectionId } = req.params;

        try {
            const updated = await Project.findOneAndUpdate(
                { _id: projectId, userId: req.user.id },
                { $pull: { "cards.$[card].sections": { _id: sectionId } } },
                {
                    arrayFilters: [{ "card._id": cardId }],
                    new: true,
                },
            );

            if (!updated) {
                return res
                    .status(404)
                    .json({ error: "Project or card not found" });
            }

            return res.json({ success: true });
        } catch (err) {
            console.error("🔴 delete-section error:", err);
            return res.status(500).json({ error: err.message });
        }
    },
);

// Delete task
router.delete(
    "/:projectId/card/:cardId/section/:sectionId/task/:taskId",
    verifyToken,
    async (req, res) => {
        const { projectId, cardId, sectionId, taskId } = req.params;

        try {
            const updated = await Project.findOneAndUpdate(
                { _id: projectId, userId: req.user.id },
                {
                    $pull: {
                        "cards.$[card].sections.$[sec].tasks": { _id: taskId },
                    },
                },
                {
                    arrayFilters: [
                        { "card._id": cardId },
                        { "sec._id": sectionId },
                    ],
                    new: true,
                },
            );

            if (!updated) {
                return res
                    .status(404)
                    .json({ error: "Project, card or section not found" });
            }

            return res.json({ success: true });
        } catch (err) {
            console.error("🔴 delete-task error:", err);
            return res.status(500).json({ error: err.message });
        }
    },
);

// PATCH card (important, dueDate, title, description)
router.patch("/:projectId/card/:cardId", verifyToken, async (req, res) => {
    const { projectId, cardId } = req.params;
    const { isImportant, dueDate, title, description } = req.body;
    try {
        const project = await Project.findOne({
            _id: projectId,
            userId: req.user.id,
        });
        if (!project)
            return res.status(404).json({ error: "Project not found" });
        const card = project.cards.id(cardId);
        if (!card) return res.status(404).json({ error: "Card not found" });
        if (typeof isImportant === "boolean") card.isImportant = isImportant;
        if (dueDate !== undefined) card.dueDate = dueDate;
        if (title !== undefined) card.title = title;
        if (description !== undefined) card.description = description;
        await project.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update card" });
    }
});

// PATCH section (title)
router.patch(
    "/:projectId/card/:cardId/section/:sectionId",
    verifyToken,
    async (req, res) => {
        const { projectId, cardId, sectionId } = req.params;
        const { title } = req.body;
        try {
            const project = await Project.findOne({
                _id: projectId,
                userId: req.user.id,
            });
            if (!project)
                return res.status(404).json({ error: "Project not found" });
            const card = project.cards.id(cardId);
            if (!card) return res.status(404).json({ error: "Card not found" });
            const section = card.sections.id(sectionId);
            if (!section)
                return res.status(404).json({ error: "Section not found" });
            if (title !== undefined) section.title = title;
            await project.save();
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed to update section" });
        }
    },
);

// PATCH task (isCompleted, title, description)
router.patch(
    "/:projectId/card/:cardId/section/:sectionId/task/:taskId",
    verifyToken,
    async (req, res) => {
        const { projectId, cardId, sectionId, taskId } = req.params;
        const { isCompleted, title, description } = req.body;
        try {
            const project = await Project.findOne({
                _id: projectId,
                userId: req.user.id,
            });
            if (!project)
                return res.status(404).json({ error: "Project not found" });
            const card = project.cards.id(cardId);
            if (!card) return res.status(404).json({ error: "Card not found" });
            const section = card.sections.id(sectionId);
            if (!section)
                return res.status(404).json({ error: "Section not found" });
            const task = section.tasks.id(taskId);
            if (!task) return res.status(404).json({ error: "Task not found" });
            if (typeof isCompleted === "boolean")
                task.isCompleted = isCompleted;
            if (title !== undefined) task.title = title;
            if (description !== undefined) task.description = description;
            await project.save();
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: "Failed to update task" });
        }
    },
);

// Update project title
router.patch("/:id", verifyToken, async (req, res) => {
    const projectId = req.params.id;
    const { title } = req.body;

    if (title.length > 35) {
        return res
            .status(400)
            .json({ error: "Project title must be 35 characters or less." });
    }

    try {
        const updatedProject = await Project.findOneAndUpdate(
            { _id: projectId, userId: req.user.id },
            { title },
            { new: true },
        );

        if (!updatedProject) {
            return res.status(404).json({ error: "Project not found" });
        }

        res.json(updatedProject);
    } catch (err) {
        res.status(500).json({ error: "Failed to update project" });
    }
});

module.exports = router;
