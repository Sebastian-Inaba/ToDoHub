const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    isCompleted: Boolean,
    tags: [String],
    attachments: [String], // Supabase file URLs 
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
