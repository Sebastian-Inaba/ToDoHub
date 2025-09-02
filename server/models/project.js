// Schema for each part of the project.js

const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
    {
        name: String,
        url: String,
        type: String,
        size: Number,
        storagePath: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: true },
);

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    isCompleted: Boolean,
    tags: [String],
    attachments: [attachmentSchema],
});

const sectionSchema = new mongoose.Schema({
    title: String,
    tasks: [taskSchema],
});

const cardSchema = new mongoose.Schema({
    title: String,
    description: String,
    createdAt: { type: Date, default: Date.now },
    dueDate: Date,
    isImportant: Boolean,
    sections: [sectionSchema],
});

const projectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: String,
    createdAt: { type: Date, default: Date.now },
    cards: [cardSchema],
});

module.exports = mongoose.model("Project", projectSchema);
