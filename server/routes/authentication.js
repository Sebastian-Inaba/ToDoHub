// Import required packages
const express = require('express'); // Import Express framework to create router
const router = express.Router(); // Create a router instance to define routes 
const bcrypt = require('bcrypt'); // Import bcrypt for hashing and verifying passwords securely
const jwt = require('jsonwebtoken'); // Import JSON Web Token for creating auth tokens
const User = require('../models/user'); // Import the User model to query MongoDB
const multer = require('multer'); // Middleware to handle file uploads
const sharp = require('sharp'); // Image processing library (e.g., convert to .webp)
const rateLimit = require('express-rate-limit'); // Import rate limiting middleware to prevent brute force attacks

// Limit each IP to 5 login attempts per 10 minutes
const rateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

// Define POST /login route to authenticate users
router.post('/login', rateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body; // Extract email and password from request body

    // Check if email and password were provided, return error if missing
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required.' });
    }

    // Look up the user by email in the database
    const user = await User.findOne({ email });
    if (!user) {
      // Return error if user with given email doesn't exist
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Compare the password provided with the hashed password stored in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Return error if password doesn't match
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Create a JWT token containing user ID and username, expires in 1 hour
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Respond with success message and the JWT token
    res.json({ message: 'Login successful!', token });
  } catch (err) {
    console.error(err); // Log unexpected server errors
    res.status(500).json({ error: 'Server error.' }); // Respond with generic server error message
  }
});

// Store uploaded files in memory (not saved to disk)
const storage = multer.memoryStorage();

// Setup multer middleware to use memory storage
const upload = multer({ storage });

// Define POST /register route to create new users
router.post('/register', rateLimiter,  upload.single('profilePic'), async (req, res) => {
  try {
    // Extract form fields from request body
    const { username, email, password } = req.body;
    let profilePic = ''; // Will hold base64 .webp image if uploaded

    // If an image was uploaded, convert it to .webp and encode to base64
    if (req.file) {
      const webpBuffer = await sharp(req.file.buffer)
        .webp({ quality: 80 }) // Convert to webp with quality 80
        .toBuffer();           // Return as a buffer

      // Store image as a base64 string (data:image/webp...)
      profilePic = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    }

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Create and save new user in MongoDB, its hashed inside the user model
    const newUser = new User({ username, email, password, profilePic });
    await newUser.save();

    // Respond with success message
    res.status(201).json({ message: 'User registered!' });

  } catch (err) {
    console.error(err);

    // Handle duplicate key error (username or email already exists)
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }

    // Generic error
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router; // Export the router so other files can use it
// This allows the authentication routes to be used in the server.js file
