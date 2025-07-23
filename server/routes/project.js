const express = require("express");
const router = express.Router();
const Project = require("../models/project");
const { verifyToken } = require("../middleware/userVerification");

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

module.exports = router;
