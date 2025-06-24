const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();

router.get('/check', (req, res) => {
  console.log('✅ /api/check called');
  console.log('Cookies received:', req.cookies);

  const token = req.cookies.token;
  if (!token) {
    console.log('❌ No token found');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', decoded);
    res.json({ id: decoded.id, username: decoded.username });
  } catch (err) {
    console.log('❌ Token invalid:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;