import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Configuration
const app = express();
const PORT = 5000;
const JWT_SECRET = 'your_jwt_secret_key'; // Replace with a secure key
const MONGO_URI = 'mongodb://127.0.0.1:27017/keeperNotes'; // Replace with your MongoDB URI

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const noteSchema = new mongoose.Schema({
  title: String,
  content: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
const Note = mongoose.model('Note', noteSchema);

// MongoDB Connection
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB', err));

// Routes
// User Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({ token, username: user.username }); // Send username
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

// Middleware to Verify Token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.userId = decoded.id;
    req.username = decoded.username; // Save username for later use
    next();
  });
};

// Add Note
app.post('/api/notes/add', authenticateToken, async (req, res) => {
  const { title, content } = req.body;

  try {
    const newNote = new Note({
      title,
      content,
      userId: req.userId,
    });
    await newNote.save();

    res.status(201).json({ message: 'Note added successfully', note: newNote });
  } catch (err) {
    res.status(500).json({ message: 'Error adding note', error: err.message });
  }
});

// Get All Notes for Logged-In User
app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notes', error: err.message });
  }
});

// Delete Note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const deletedNote = await Note.findOneAndDelete({ _id: id, userId: req.userId });
    if (!deletedNote) {
      return res.status(404).json({ message: 'Note not found or unauthorized' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting note', error: err.message });
  }
});

// Welcome Route
app.get('/api/auth/welcome', authenticateToken, (req, res) => {
  res.json({ message: `Welcome, ${req.username}!` }); // Personalized welcome message
});

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
