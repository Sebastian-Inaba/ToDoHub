const mongoose = require("mongoose"); // Import Mongoose to define schema and interact with MongoDB
const bcrypt = require("bcrypt"); // Import bcrypt for hashing passwords securely

// Define the schema for User documents in MongoDB
// note, mongoDB makes user id's automatically so if using some other database might need to include id
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String, // Username is a string
            required: true, // It must be provided (not null or undefined)
            unique: true, // No two users can have the same username
            trim: true, // Automatically remove whitespace from beginning/end
        },
        email: {
            type: String, // Email is a string
            required: true, // Email must be provided
            unique: true, // Emails must be unique (no duplicates allowed)
            lowercase: true, // Convert email to lowercase before saving (to ensure uniqueness)
        },
        password: {
            type: String, // Password is stored as a string (hashed, not plain text)
            required: true, // Password is required for every user
        },
        profilePic: {
            type: String, // Stores the profile picture as a string (usually a URL or base64 string)
            default: "", // Default value is empty string (no profile pic)
        },
        createdAt: {
            type: Date, // Stores the date when user was created. Also used for when deleting temporary users
            default: Date.now, // Defaults to the current date/time when created
        },
        isPermanent: {
            type: Boolean, // Boolean flag to mark if user is permanent or temporary
            default: false, // Defaults to false, meaning user is temporary unless specified. Meaning if you want a permanent user, you can set this to true
        },
    },
    { timestamps: true },
); // Automatically add `createdAt` and `updatedAt` fields

// Pre-save hook: runs before saving and sending a new user to the database
// This is where we hash the password before saving it to the database
userSchema.pre("save", async function (next) {
    // Check if password field has been modified (or is new)
    if (!this.isModified("password")) return next();

    // Hash the password using bcrypt with salt rounds = 10
    this.password = await bcrypt.hash(this.password, 10);

    // Continue with saving the user data to the database
    next();
});

// Export the model so it can be imported and used elsewhere in the app
module.exports = mongoose.model("User", userSchema);
