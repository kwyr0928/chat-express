require('dotenv').config();

const pool = require('../config/database');

let connects = {};

async function saveMessage(message, eventId, userName) {
  const query = 'INSERT INTO messages (content, event_id, user_name) VALUES ($1, $2, $3)';
  await pool.query(query, [message, eventId, userName]);
}

async function getMessages(eventId) {
  const query = 'SELECT user_name, content FROM messages WHERE event_id = $1 ORDER BY created_at DESC LIMIT 50';
  const result = await pool.query(query, [eventId]);
  return result.rows.map(row => ({ userName: row.user_name, message: row.content }));
}

module.exports = function(app) {
  app.ws('/ws', async (ws, req) => {
    const eventId = req.query.eventId;
    if (!eventId) {
      ws.close(1008, 'event ID is required');
      return;
    }

    if (!connects[eventId]) {
      connects[eventId] = new Set();
    }
    connects[eventId].add(ws);

    try {
      const messages = await getMessages(eventId);
      messages.forEach(message => {
        ws.send(JSON.stringify(message));
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      ws.send(JSON.stringify({ error: 'Error fetching messages' }));
    }

    ws.on('message', async (message) => {
      console.log('Received:', message);

      try {
        const parsedMessage = JSON.parse(message);
        await saveMessage(parsedMessage.message, parsedMessage.eventId, parsedMessage.userName);

        connects[parsedMessage.eventId].forEach((socket) => {
          if (socket.readyState === 1) { // WebSocket.OPEN
            socket.send(JSON.stringify(parsedMessage));
          }
        });
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', () => {
      connects[eventId].delete(ws);
      if (connects[eventId].size === 0) {
        delete connects[eventId];
      }
    });
  });
};