const amqp = require('amqplib');
const { MongoClient } = require('mongodb');
const redisClient = require('./redisClient');

const nodemailer = require("nodemailer");

// Tạo transporter sử dụng MailHog
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

async function consumeMessages() {
  const mongoClient = new MongoClient('mongodb://mongodb:27017');
  await mongoClient.connect();
  const db = mongoClient.db('messagesDB');
  const collection = db.collection('messages');
  const connection = await amqp.connect('amqp://rabbitmq:5672');
  const channel = await connection.createChannel();
  const queue = 'task_queue';
  await channel.assertQueue(queue, { durable: true });
// Prefetch(1) để xử lý từng message một cách tuần tự
  await channel.prefetch(1);
  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      try {

        const emailData = JSON.parse(msg.content.toString());
        console.log('Message is new, delaying insert...');
        await collection.insertOne(emailData);
        await processRedis();
        console.log("Received:", emailData);
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
