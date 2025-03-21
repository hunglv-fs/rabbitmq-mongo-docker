const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');
const redisClient = require('./redisClient');
const app = express();
app.use(cors());
app.use(express.json());



const RABBITMQ_URL = 'amqp://rabbitmq:5672';

async function sendMessages() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  const queue = 'task_queue';
  await channel.assertQueue(queue, { durable: true });

  for (let i = 0; i < 10000; i++) {
    const msg = `Message ${i}`;
    channel.sendToQueue(queue, Buffer.from(msg), { persistent: true });
  }

  console.log('Sent 10,000 messages');
  await redisClient.set('processed_count', '0'); // Reset progress
  setTimeout(() => connection.close(), 500);
}

app.get('/', async (req, res) => {
  res.json({ message: 'RabbitMQ Producer' });
});
app.post('/send-messages', async (req, res) => {
  try {
    await sendMessages();
    res.json({ message: '10,000 messages sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send messages' });
  }
});

app.get('/status', async (req, res) => {
  const processedCount = await redisClient.get('processed_count') || '0';
  res.json({ processed: parseInt(processedCount), total: 10000 });
});
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
