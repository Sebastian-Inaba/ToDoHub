// Import required packages
const express = require('express'); // Import Express framework to create router
const router = express.Router(); // Create a router instance to define routes modularly
const bcrypt = require('bcrypt'); // Import bcrypt for hashing and verifying passwords securely
const jwt = require('jsonwebtoken'); // Import JSON Web Token for creating auth tokens
const User = require('../models/user'); // Import the User model to query MongoDB

// Define POST /login route to authenticate users
router.post('/login', async (req, res) => {
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

module.exports = router; // Export the router so other files can use it
// This allows the authentication routes to be used in the server.js file
