const amqp = require('amqplib');
const { MongoClient } = require('mongodb');
const redisClient = require('./redisClient');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const nodemailer = require("nodemailer");

// Cấu hình kết nối MySQL
const mysqlPool = mysql.createPool({
  host: 'mysql',
  user: 'user',
  password: 'password',
  database: 'messagesDB',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Cấu hình kết nối PostgreSQL
const pgPool = new Pool({
  host: 'postgres',
  user: 'postgres',
  password: 'password',
  database: 'messagesDB',
  port: 5432,
});

// Cấu hình MailHog
const transporter = nodemailer.createTransport({
  host: "mailhog",
  port: 1025,
  secure: false,
  auth: null
});

async function sendEmail(to, name, message) {
  try {
    let info = await transporter.sendMail({
      from: '"RabbitMQ System" <noreply@example.com>',
      to: to,
      subject: `Hello ${name}, your message has been received!`,
      text: message,
    });
    console.log(`Email sent to ${to}:`, info.messageId);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
}

async function processRedis() {
  let processedCount = await redisClient.get('processed_count') || '0';
  processedCount = parseInt(processedCount) + 1;
  await redisClient.set('processed_count', processedCount.toString());
  console.log(`Processed: ${processedCount}/10000`);
}

async function saveToMySQL(message) {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction(); // Bắt đầu transaction

    // Insert vào bảng messages
    const sqlMessage = `INSERT INTO messages (name, email, message, type, status, created_at, sent_at, error, attempts, last_attempt, important, visibility, priority, tags, metadata, sent, size) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        const formattedCreatedAt = new Date(message.createdAt).toISOString().slice(0, 19).replace("T", " ");
                        const formattedSentAt = message.sentAt ? new Date(message.sentAt).toISOString().slice(0, 19).replace("T", " ") : null;
                    
    const [result] = await connection.execute(sqlMessage, [
      message.name, message.email, message.message, message.type, message.status,
      formattedCreatedAt, formattedSentAt, message.error, message.attempts,
      message.lastAttempt, message.important, message.visibility, message.priority,
      JSON.stringify(message.tags), JSON.stringify(message.metadata), message.sent,
      message.size
    ]);

    const messageId = result.insertId; // Lấy message_id từ insertId

    console.log("Saved to MySQL, message_id:", messageId);

    // Insert vào bảng attachments nếu có
    if (message.attachments && message.attachments.length > 0) {
      const sqlAttachment = `INSERT INTO attachments (message_id, filename, type, size) VALUES ?`;

      const attachmentValues = message.attachments.map(att => [
        messageId, att.filename, att.type, att.size
      ]);

      await connection.query(sqlAttachment, [attachmentValues]);

      console.log("Attachments inserted:", message.attachments.length);
    }

    await connection.commit(); // Commit transaction nếu không có lỗi
  } catch (error) {
    await connection.rollback(); // Rollback nếu có lỗi
    console.error("Error saving to MySQL:", error);
  } finally {
    connection.release(); // Giải phóng connection về pool
  }
}

async function saveToPostgreSQL(message) {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN"); // Bắt đầu transaction

    // Insert vào bảng messages và lấy message_id
    const sqlMessage = `
      INSERT INTO messages (name, email, message, type, status, created_at, sent_at, error, attempts, last_attempt, important, visibility, priority, tags, metadata, sent, size) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      RETURNING id`;
      const formattedTags = `{${message.tags.join(",")}}`; // Nếu cột tags là TEXT[]
    const res = await client.query(sqlMessage, [
      message.name, message.email, message.message, message.type, message.status,
      message.createdAt, message.sentAt, message.error, message.attempts,
      message.lastAttempt, message.important, message.visibility, message.priority,
      formattedTags, JSON.stringify(message.metadata), message.sent,
      message.size
    ]);

    const messageId = res.rows[0].id; // Lấy message_id từ kết quả trả về

    console.log("Saved to PostgreSQL, message_id:", messageId);

    // Insert vào bảng attachments nếu có
    if (message.attachments && message.attachments.length > 0) {
      const sqlAttachment = `
        INSERT INTO attachments (message_id, filename, type, size) 
        VALUES ${message.attachments.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(", ")}`;

      const attachmentValues = message.attachments.flatMap(att => [
        messageId, att.filename, att.type, att.size
      ]);

      await client.query(sqlAttachment, attachmentValues);

      console.log("Attachments inserted:", message.attachments.length);
    }

    await client.query("COMMIT"); // Commit transaction nếu không có lỗi
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback nếu có lỗi
    console.error("Error saving to PostgreSQL:", error);
  } finally {
    client.release(); // Giải phóng connection về pool
  }
}


async function consumeMessages() {
  const mongoClient = new MongoClient('mongodb://mongodb:27017');
  await mongoClient.connect();
  const db = mongoClient.db('messagesDB');
  const collection = db.collection('messages');
  
  const connection = await amqp.connect('amqp://rabbitmq:5672');
  const channel = await connection.createChannel();
  const queue = 'task_queue';
  await channel.assertQueue(queue, { durable: true });

  await channel.prefetch(1);
  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      try {
        const emailData = JSON.parse(msg.content.toString());

        console.log('Processing message:', emailData.email);
        
        await collection.insertOne(emailData);
        await saveToMySQL(emailData);
        await saveToPostgreSQL(emailData);
        await processRedis();

        await sendEmail(emailData.email, emailData.name, emailData.message);
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  });

  console.log('Waiting for messages...');
}

consumeMessages();
