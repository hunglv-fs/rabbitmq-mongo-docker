const amqp = require('amqplib');
const { MongoClient } = require('mongodb');
const redisClient = require('./redisClient');

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
        const message = msg.content.toString();
        console.log(`Received: ${message}`);
      
        console.log('Message is new, delaying insert...');
        await collection.insertOne({ message });

        console.log('Message inserted into database' + message);

        let processedCount = await redisClient.get('processed_count') || '0';
        processedCount = parseInt(processedCount) + 1;

        await redisClient.set('processed_count', processedCount.toString());
        console.log(`Processed: ${processedCount}/10000`);

        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
  });

  console.log('Waiting for messages...');
}

consumeMessages();
