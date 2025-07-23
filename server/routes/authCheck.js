const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();

router.get("/check", (req, res) => {
    //console.log('/api/check called'); error checking
    //console.log('Cookies received:', req.cookies); error checking

    const token = req.cookies.token; // Creates a token variable from the cookies

    if (!token) {
        console.log("No token found");
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        // console.log('Token decoded:', decoded); error check
        res.json({ id: decodedToken.id, username: decodedToken.username });
    } catch (err) {
        // console.log('Token invalid:', err.message); // error check
        res.status(401).json({ error: "Invalid token" });
    }
});

module.exports = router;
