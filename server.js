// PDFSwift Backend Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/conversions', require('./routes/conversions'));
app.use('/api/payments', require('./routes/payments'));

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`PDFSwift server running on http://localhost:${PORT}`);
    console.log(`\n📋 Setup Instructions:`);
    console.log(`1. Copy .env.example to .env and configure your settings`);
    console.log(`2. Set up PostgreSQL database and run config/database.sql`);
    console.log(`3. Configure Stripe keys in .env`);
    console.log(`4. Run: npm install`);
    console.log(`5. Run: npm start\n`);
});

module.exports = app;
