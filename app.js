const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const sequelize = require('./config/db');

dotenv.config({ path: './config/config.env' });

require('./config/passport');

const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const googleRoutes = require('./routes/googleRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', googleRoutes);

app.get('/', (req, res) => {
  res.send('✅ Tradesman Travel App API is running...');
});

sequelize
  .sync({ alter: true })
  .then(() => console.log('✅ MySQL Database synced successfully'))
  .catch((err) => console.error('❌ Database sync error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
