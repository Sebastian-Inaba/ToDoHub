// Import required packages
const express = require("express"); // Import Express framework to create router
const router = express.Router(); // Create a router instance to define routes
const bcrypt = require("bcrypt"); // Import bcrypt for hashing and verifying passwords securely
const jwt = require("jsonwebtoken"); // Import JSON Web Token for creating auth tokens
const User = require("../models/user"); // Import the User model to query MongoDB
const multer = require("multer"); // Middleware to handle file uploads
const sharp = require("sharp"); // Image processing library (e.g., convert to .webp)
const rateLimit = require("express-rate-limit"); // Import rate limiting middleware to prevent brute force attacks
const storage = multer.memoryStorage(); // Store uploaded files in memory (not saved to disk)
const upload = multer({ storage }); // Setup multer middleware to use memory storage
const validator = require("validator"); // Checks if a string is a valid value
const { createClient } = require("@supabase/supabase-js"); // Import of supabase so we can create clients for pfp upload in register
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
); // Client use the url and secret key for upload

// Rate limit for login and register
const rateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP to 5 requests per window
    message: { error: "Too many attempts. Please try again later." },
    standardHeaders: true, // Modern headers to send hidden info about request limits to the client
    legacyHeaders: false, // Old headers that also sent this hidden limit info but are outdated
});

// Define POST /login route to authenticate users
router.post("/login", rateLimiter, async (req, res) => {
    try {
        const { email, password } = req.body; // Extract email and password from request body

        // Check if email and password were provided, return error if missing
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "Email and password required." });
        }

        // Checks if the email is a valid email
        if (!validator.isEmail(email)) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        // Checks so password is string or under 6 characters
        if (typeof password !== "string" || password.length < 4) {
            return res
                .status(400)
                .json({ error: "Password must be at least 4 characters." });
        }

        // Look up the user by email in the database
        const user = await User.findOne({ email });
        if (!user) {
            // Return error if user with given email doesn't exist
            return res
                .status(400)
                .json({ error: "Invalid email or password." });
        }

        // Compare the password provided with the hashed password stored in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Return error if password doesn't match
            return res
                .status(400)
                .json({ error: "Invalid email or password." });
        }

        // Create a JWT token containing user ID and username, expires in 15 minutes
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "15min" },
        );

        // Create a JWT refresh token that last 2 hours
        const refreshToken = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "2h" },
        );

        //  Set the JWT tokens as an HTTP-only cookie to prevent XSS attacks
        // This cookie will be sent with every request to authenticate the user
        res.cookie("token", token, {
            httpOnly: true, // Cannot be read by JavaScript
            secure: false, // Only sent over HTTPS, on localhost it can be false. BUT in production, it should be true
            sameSite: "Strict", // Blocks CSRF
            maxAge: 15 * 60 * 1000, // 15min expiry
            path: "/", // Accessible across all routes
            //domain: 'yourdomain.com'// Lock to your domain in production, but not needed for localhost since it will be set to localhost
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true, // Cannot be read by JavaScript
            secure: false, // Only sent over HTTPS, on localhost it can be false. BUT in production, it should be true
            sameSite: "Strict", // Blocks CSRF
            maxAge: 2 * 60 * 60 * 1000, // 2 hour expiry
            path: "/", // Accessible across all routes
            //domain: 'yourdomain.com'// Lock to your domain in production, but not needed for localhost since it will be set to localhost
        });

        // Respond with success message and the JWT token
        res.json({ message: "Login successful!" });
    } catch (err) {
        console.error(err); // Log unexpected server errors
        res.status(500).json({ error: "Server error." }); // Respond with generic server error message
    }
});

// Define POST /register route to create new users
router.post(
    "/register",
    rateLimiter,
    upload.single("profilePic"),
    async (req, res) => {
        try {
            // Extract form fields from request body
            const { username, email, password } = req.body;
            let profilePicUrl = ""; // Will hold base64 .webp image if uploaded

            // If an image was uploaded, convert it to .webp and encode to base64
            if (req.file) {
                // Convert uploaded file buffer to WebP buffer using sharp
                const webpBuffer = await sharp(req.file.buffer)
                    .webp({ quality: 80 })
                    .toBuffer();

                // Generate a unique filename for the upload, sets the uploaded name with a current date and a random num just in case 2 users would register at the same time
                const randomNum = Math.floor(Math.random() * 10000);
                const filename = `user-profile-${Date.now()}-${randomNum}.webp`;

                // Upload to Supabase Storage bucket
                const { data, error } = await supabase.storage
                    .from("todohubimages")
                    .upload(filename, webpBuffer, {
                        contentType: "image/webp",
                        cacheControl: "3600",
                        upsert: false,
                    });

                if (error) {
                    console.error("Supabase upload error:", error);
                    return res
                        .status(500)
                        .json({ error: "Failed to upload image" });
                }

                // Get the public URL for the uploaded image
                profilePicUrl = supabase.storage
                    .from("todohubimages")
                    .getPublicUrl(filename).data.publicUrl;
            }

            // Validate required fields
            if (!username || !email || !password) {
                return res
                    .status(400)
                    .json({ error: "All fields are required." });
            }

            // Checks if email is a valid email
            if (!validator.isEmail(email)) {
                return res.status(400).json({ error: "Invalid email format." });
            }

            // Checks so username is not any kind of attmept of injection
            if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
                return res.status(400).json({ error: "Invalid username." });
            }

            // Checks so password is string or under 6 characters
            if (typeof password !== "string" || password.length < 4) {
                return res
                    .status(400)
                    .json({ error: "Password must be at least 4 characters." });
            }

            // Create and save new user in MongoDB, its hashed inside the user model
            const newUser = new User({
                username,
                email,
                password,
                profilePic: profilePicUrl, // with the supabase url
            });
            await newUser.save();

            // Respond with success message
            res.status(201).json({ message: "User registered!" });
        } catch (err) {
            console.error(err);

            // Handle duplicate key error (username or email already exists)
            if (err.code === 11000) {
                return res
                    .status(400)
                    .json({ error: "Username or email already exists." });
            }

            // Generic error
            res.status(500).json({ error: "Something went wrong" });
        }
    },
);

// logout route to clear the JWT cookie
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        path: "/",
        // domain: 'yourdomain.com', // Lock to your domain in production, but not needed for localhost
        secure: false, // Set to true in production, false for localhost
        httpOnly: true,
    });
    res.clearCookie("refreshToken", {
        path: "/",
        // domain: 'yourdomain.com', // Lock to your domain in production, but not needed for localhost
        secure: false, // Set to true in production, false for localhost
        httpOnly: true,
    });
    res.json({ message: "Logged out successfully" });
});

// Token refresh route to create the new token if refreshToken still exists
// In the login route we make 2 tokens one for access and one for long use
// It would be better to create a more advanced token refresh system that posts and gets them from a data base
// If i do that i could include more security like ip checking and blacklisting or pulling tokens during suspicious activity
// But i wont do that for this project as this is a mostly for showcase use
router.post("/refreshToken", (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        // Clear cookie if missing
        res.clearCookie("refreshToken", {
            path: "/",
            secure: false, // put true in production
            httpOnly: true,
            sameSite: "Strict",
        });
        return res.status(401).json({ error: "no refresh token provided" });
    }

    // If this route is called, it checks if there is a refreshToken and then creates a new "access" token which then gets checked in authCheck
    try {
        const decodedToken = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET,
        );

        const newToken = jwt.sign(
            { id: decodedToken.id, username: decodedToken.username },
            process.env.JWT_SECRET,
            { expiresIn: "15min" },
        );

        res.cookie("token", newToken, {
            httpOnly: true,
            secure: false, // put true in production
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000,
            path: "/",
        });

        res.json({ message: "token refreshed" });
    } catch (err) {
        // Clear refreshToken cookie if invalid or expired
        res.clearCookie("refreshToken", {
            path: "/",
            secure: false, // put true in production
            httpOnly: true,
            sameSite: "Strict",
        });
        console.log("refresh token error:", err);
        return res
            .status(403)
            .json({ error: "Invalid or expired refresh token" });
    }
});

module.exports = router; // Export the router so other files can use it
// This allows the authentication routes to be used in the server.js file
