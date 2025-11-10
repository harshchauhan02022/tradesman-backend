// app.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session'); // ✅ Google OAuth ke liye required
const passport = require('passport');
const sequelize = require('./config/db');

// Load environment variables first
dotenv.config({ path: './config/config.env' });

// Import passport config (ye line dotenv ke baad aani chahiye)
require('./config/passport');

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const googleRoutes = require('./routes/googleRoutes');

// Initialize app
const app = express();

// 🔹 Middlewares
app.use(cors());
app.use(express.json());

// ✅ Session setup (Google OAuth ke liye zaroori hai)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

// ✅ Initialize Passport
app.use(passport.initialize());
app.use(passport.session()); // session support for OAuth

// 🔹 API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', googleRoutes);

// 🔹 Test Route
app.get('/', (req, res) => {
  res.send('✅ Tradesman Travel App API is running...');
});

// 🔹 Sync Database
sequelize
  .sync({ alter: true })
  .then(() => console.log('✅ MySQL Database synced successfully'))
  .catch((err) => console.error('❌ Database sync error:', err));

// 🔹 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
