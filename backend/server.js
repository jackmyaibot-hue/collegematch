const express = require('express');
require('dotenv').config();

const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error('Unable to connect to the database:', err);
});
