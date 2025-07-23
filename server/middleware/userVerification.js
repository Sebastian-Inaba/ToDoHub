const jwt = require("jsonwebtoken");

// Middleware to verify user authentication token to get user information
// This middleware checks for a JWT in the request cookies and verifies it.
function verifyToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid token" });
    }
}

module.exports = { verifyToken };
