// Load environment variables from a .env file into process.env
require("dotenv").config();

// Import required packages
const express = require("express"); // Web framework for building REST APIs
const mongoose = require("mongoose"); // MongoDB ODM (Object Data Modeling) tool
const cors = require("cors"); // Middleware to allow cross-origin requests
const User = require("./models/user.js"); // Mongoose model for users stored in the database
const { createClient } = require("@supabase/supabase-js"); // Import of supabase so we can create clients for user deletion
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
); // Client use the url and key

// Initialize the Express application to handle HTTP requests between the frontend, backend, and MongoDB.
// This is the main entry point for your backend server and handles all API routes.
// In production, it will connect to a cloud-hosted MongoDB database and serve requests over HTTPS.
// In development, it runs locally at http://localhost:3000.
const app = express();

// Middleware to parse cookies from incoming requests
// This allows us to read cookies sent by the client (e.g., authentication tokens)
// We are using this for our JWT http-only cookie authentication
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Enable CORS (Cross-Origin Resource Sharing)
// This allows other websites (like your frontend on another port/domain) to access this backend
app.use(cors()); // Example: Allow frontend at http://localhost:3000 to call this API

// Parse incoming request bodies as JSON so they can be easily accessed in routes as JavaScript objects
// This is necessary for handling form submissions and JSON data sent from the frontend
// The data sent is hashed, stored in MongoDB and not stored in plain text
app.use(express.json());

// MongoDB middleware that prevents operator injections
// MongoDB queries accept special operators starting with '$' (like $gt, $ne, $or)
// An attacker could try to inject these in user input to manipulate queries and bypass security
// However this does not work, its bugged cus of express or node.js not working together
// const mongoSanitize = require('express-mongo-sanitize');
// app.use(mongoSanitize());

// Load MongoDB URI from environment variables .env file
// This should contain the connection string to your MongoDB database
const uri = process.env.MONGODB_URI;

// Connect to MongoDB using Mongoose
mongoose
    .connect(uri)
    .then(() => console.log("✅ Connected to MongoDB!"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// Users who are not marked isPermanent: true will be deleted after 1 hour
const deleteAfterHour = 1; // Set to 1 hour for temporary users

// Helper to get filename from URL
function extractFilenameFromUrl(url) {
    return url ? url.split("/").pop() : null;
}

// Run every hour to clean up expired temporary users
// Function to delete temporary users older than 1 hour along with their profile pictures from Supabase
async function deleteUsers() {
    // Calculate the cutoff timestamp
    const cutoff = new Date(Date.now() - deleteAfterHour * 60 * 60 * 1000);

    try {
        // Find users who are not marked as permanent AND were created before the cutoff time
        const usersToDelete = await User.find({
            isPermanent: false,
            createdAt: { $lt: cutoff },
        });

        let deletedCount = 0; // Counter to keep track of how many users are deleted

        // Checks if every user being delete have a pfp
        for (const user of usersToDelete) {
            // Extract the filename from the user's profilePic URL
            const filename = extractFilenameFromUrl(user.profilePic);

            // If the user has a profile picture stored in Supabase, try to delete it
            if (filename) {
                // Debug logs, had a problem with pfp not being deleted but it seems to work now
                // console.log('Supabase URL:', process.env.SUPABASE_URL);
                // console.log('Using Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
                // console.log('Deleting from bucket:', 'todohubimages');
                // console.log('Deleting filename:', filename);
                const { error } = await supabase.storage
                    .from("todohubimages")
                    .remove([filename]);
                if (error) {
                    console.error(
                        `Failed to delete image "${filename}" from Supabase:`,
                        error.message,
                    );
                } else {
                    console.log(
                        `Deleted profile image "${filename}" from Supabase`,
                    );
                }
            }

            // Delete the user from MongoDB by their id
            await User.deleteOne({ _id: user._id });
            console.log(`🗑️ Deleted user "${user.username}" from MongoDB`);

            // Increment the count of deleted users
            deletedCount++;
        }

        // Log the total number of deleted users
        console.log(
            `✅ Cleanup complete. Total temporary users deleted: ${deletedCount}`,
        );
    } catch (err) {
        // Catch and log any errors that occurred during the cleanup
        console.error("❌ Error during user cleanup:", err);
    }
}

// Run once at startup
deleteUsers();
// Run every hour
setInterval(deleteUsers, 60 * 60 * 1000);

// --------------------
// AUTH ROUTES
// --------------------

// Import authentication routes from a separate files
// These files contains routes for user authentication
const authRoutes = require("./routes/authentication");
const authCheckRoutes = require("./routes/authCheck");
const projectRoutes = require("./routes/project");

// Use them under /api
app.use("/api", authRoutes);
app.use("/api", authCheckRoutes);
app.use("/api/project", projectRoutes);

// --------------------
// START THE SERVER
// --------------------

app.use(express.static("public")); // Serve static files from the 'public' directory (e.g., HTML, CSS, JS)

const PORT = 3000; // Port to run the server on

app.listen(PORT, () =>
    console.log(`🚀 Server running at http://localhost:${PORT}`),
);

console.log("Server time:", new Date().toLocaleString()); // Log the current local time of the server
