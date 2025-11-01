const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://mtgcardbuilder-frontend.vercel.app', 'https://wolfehoovermarine.com'],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  trustProxy: true
});
app.use('/api/', limiter);

// In-memory database
const users = {};
const cardsDb = {};

// Pre-loaded test account
users['wolfe_hoover'] = {
  username: 'wolfe_hoover',
  email: 'wolfehoover@example.com',
  password: bcrypt.hashSync('password', 10),
  createdAt: new Date()
};

cardsDb['wolfe_hoover'] = [
  { name: 'Caesar, Legion\'s Emperor', type: 'Legendary Creature', rarity: 'mythic', setName: 'Fallout', image: 'https://via.placeholder.com/100x150' },
  { name: 'Aradesh, the Founder', type: 'Legendary Creature', rarity: 'mythic', setName: 'Fallout', image: 'https://via.placeholder.com/100x150' },
  { name: 'Frodo Baggins', type: 'Legendary Creature', rarity: 'rare', setName: 'Lord of the Rings', image: 'https://via.placeholder.com/100x150' },
  { name: 'Samwise the Stouthearted', type: 'Legendary Creature', rarity: 'rare', setName: 'Lord of the Rings', image: 'https://via.placeholder.com/100x150' }
];

// Routes
app.post('/api/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (users[username]) {
    return res.status(409).json({ error: 'User already exists' });
  }

  users[username] = {
    username,
    email,
    password: bcrypt.hashSync(password, 10),
    createdAt: new Date()
  };

  cardsDb[username] = [];

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  const user = users[username];
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username });
});

app.get('/api/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ username: decoded.username });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/cards', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const cards = cardsDb[decoded.username] || [];
    res.json({ cards });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/cards', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { cards } = req.body;

    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'Cards must be an array' });
    }

    if (!cardsDb[decoded.username]) {
      cardsDb[decoded.username] = [];
    }

    cardsDb[decoded.username].push(...cards);
    res.json({ success: true, count: cards.length });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.delete('/api/cards/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const cardIndex = parseInt(req.params.id);

    if (cardsDb[decoded.username] && cardsDb[decoded.username][cardIndex]) {
      cardsDb[decoded.username].splice(cardIndex, 1);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Card not found' });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
