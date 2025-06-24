// Load environment variables from a .env file into process.env
require('dotenv').config();

// Import required packages
const express = require('express');         // Web framework for building REST APIs
const mongoose = require('mongoose');       // MongoDB ODM (Object Data Modeling) tool
const cors = require('cors');               // Middleware to allow cross-origin requests
const User = require('./models/user.js');   // Mongoose model for users stored in the database

// Initialize the Express application to handle HTTP requests between the frontend, backend, and MongoDB.
// This is the main entry point for your backend server and handles all API routes.
// In production, it will connect to a cloud-hosted MongoDB database and serve requests over HTTPS.
// In development, it runs locally at http://localhost:3000.
const app = express();

// Middleware to parse cookies from incoming requests
// This allows us to read cookies sent by the client (e.g., authentication tokens)
// We are using this for our JWT http-only cookie authentication
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Enable CORS (Cross-Origin Resource Sharing)
// This allows other websites (like your frontend on another port/domain) to access this backend
app.use(cors()); // Example: Allow frontend at http://localhost:3000 to call this API

// Parse incoming request bodies as JSON so they can be easily accessed in routes as JavaScript objects
// This is necessary for handling form submissions and JSON data sent from the frontend
// The data sent is hashed, stored in MongoDB and not stored in plain text
app.use(express.json());

// Load MongoDB URI from environment variables .env file
// This should contain the connection string to your MongoDB database
const uri = process.env.MONGODB_URI;

// Connect to MongoDB using Mongoose
mongoose.connect(uri)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Users who are not marked isPermanent: true will be deleted after 1 hour
const deleteAfterHour = 1; // Set to 1 hour for temporary users

// Run every hour to clean up expired temporary users
setInterval(async () => {
  console.log('🕒 Running cleanup for temporary users...');
  const cutoff = new Date(Date.now() - deleteAfterHour * 60 * 60 * 1000); // 24 hours ago
  try {
    const result = await User.deleteMany({
      isPermanent: false,             // Only delete non-permanent users
      createdAt: { $lt: cutoff }      // Created before cutoff time
    });
    console.log(`🗑️ Deleted ${result.deletedCount} temporary users.`);
  } catch (err) {
    console.error('Error deleting temporary users:', err);
  }
}, 60 * 60 * 1000); // Run this every hour

// --------------------
// AUTH ROUTES
// --------------------

// Import authentication routes from a separate files
// These files contains routes for user authentication
const authRoutes = require('./routes/authentication');
const authCheckRoutes = require('./routes/authCheck');

// Use them under /api
app.use('/api', authRoutes);
app.use('/api', authCheckRoutes);

// --------------------
// START THE SERVER
// --------------------

app.use(express.static('public')); // Serve static files from the 'public' directory (e.g., HTML, CSS, JS)

const PORT = 3000; // Port to run the server on

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));   

console.log('Server time:', new Date().toLocaleString()); // Log the current local time of the server