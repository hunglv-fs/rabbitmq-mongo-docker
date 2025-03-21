const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');
const redisClient = require('./redisClient');
const app = express();
app.use(cors());
app.use(express.json());

const RABBITMQ_URL = 'amqp://rabbitmq:5672';
const message_count = 10000; // Number of messages to send
async function sendMessages() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();
  const queue = 'task_queue';
  await channel.assertQueue(queue, { durable: true });

  for (let i = 0; i < message_count; i++) {
    // const msg = `Message ${i}`;
    const messageObj = {
      name: `User ${i}`,
      email: `user${i}@example.com`,
      message: `Hello from user ${i}`,
      type: 'email',
      status: 'pending',
      createdAt: new Date().toISOString(),
      sentAt: null,
      error: null,
      attempts: 0,
      lastAttempt: null,
      important: i%0==0 ? true : false,
      visibility : i%0==0 ? 'public' : 'private',
      priority: 1,
      tags: [ 'tag1', 'tag2' ],
      metadata: {
        source: 'rabbitmq-mongo-docker',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      },
      sent: false,
      size: 0.0001,
      attachments: [
        {
          filename: `attachment${i}.txt`,
          size: 0.0001,
          type: 'text/plain'
        }
      ]
    };
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(messageObj)), {
      persistent: true,
    });
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
