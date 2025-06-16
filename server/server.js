require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const User = require('./models/user.js');

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB!'))
  .catch((err) => console.error('MongoDB connection error:', err));

const storage = multer.memoryStorage();
const upload = multer({ storage });

const deleteAfterHour = 24;

setInterval(async () => {
  const cutoff = new Date(Date.now() - deleteAfterHour * 60 * 60 * 1000);
  try {
    const result = await User.deleteMany({
      isPermanent: false,
      createdAt: { $lt: cutoff }
    });
    console.log(`Deleted ${result.deletedCount} temporary users.`);
  } catch (err) {
    console.error('Error deleting temporary users:', err);
  }
}, 60 * 60 * 1000);

// Register route
app.post('/register', upload.single('profilePic'), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let profilePic = '';

    if (req.file) {
      const webpBuffer = await sharp(req.file.buffer)
        .webp({ quality: 80 })
        .toBuffer();

      profilePic = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    }

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newUser = new User({ username, email, password, profilePic });
    await newUser.save();

    res.status(201).json({ message: 'User registered!' });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists.' });
    }
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const authRoutes = require('./routes/authentication');
app.use('/api', authRoutes);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
