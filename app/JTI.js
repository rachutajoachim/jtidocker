const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 80;

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    connection.release();
    console.log('Table "messages" is ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Run this function at startup
initializeDatabase();
// Test database connection
app.get('/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    res.send('Database connection successful');
    connection.release();
  } catch (err) {
    res.status(500).send('Database connection failed: ' + err.message);
  }
});

// Store message
app.post('/messages', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).send('Message is required');
  try {
    const connection = await pool.getConnection();
    await connection.query('INSERT INTO messages (content) VALUES (?)', [message]);
    connection.release();
    res.redirect('/');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Retrieve messages
app.get('/messages', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM messages');
    connection.release();
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Serve UI
app.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM messages');
    connection.release();
    res.send(`
      <html>
      <head><title>Message Board</title></head>
      <body>
        <h1>Message Board</h1>
        <form action="/messages" method="post">
          <input type="text" name="message" placeholder="Enter message" required />
          <button type="submit">Submit</button>
        </form>
        <ul>
          ${rows.map(row => `<li>${row.content}</li>`).join('')}
        </ul>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});