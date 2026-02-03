import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';

export const queueRouter = Router();

// Get all queued messages
queueRouter.get('/', (req, res) => {
  const { status, chat_id } = req.query;
  let query = 'SELECT * FROM message_queue';
  const params: any[] = [];
  const conditions: string[] = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (chat_id) {
    conditions.push('chat_id = ?');
    params.push(chat_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY scheduled_time ASC';

  const queueItems = db.prepare(query).all(...params);
  res.json(queueItems);
});

// Schedule a new message
queueRouter.post('/', (req, res) => {
  const { chat_id, user_message, scheduled_time } = req.body;

  if (!chat_id || !user_message || !scheduled_time) {
    return res.status(400).json({
      error: 'chat_id, user_message, and scheduled_time are required'
    });
  }

  const id = uuid();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO message_queue (id, chat_id, user_message, scheduled_time, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, chat_id, user_message, scheduled_time, now);

    const queueItem = db.prepare('SELECT * FROM message_queue WHERE id = ?').get(id);
    res.status(201).json(queueItem);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific queue item
queueRouter.get('/:id', (req, res) => {
  const queueItem = db.prepare('SELECT * FROM message_queue WHERE id = ?').get(req.params.id);
  if (!queueItem) {
    return res.status(404).json({ error: 'Queue item not found' });
  }
  res.json(queueItem);
});

// Cancel/delete a queue item
queueRouter.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM message_queue WHERE id = ? AND status = ?')
    .run(req.params.id, 'pending');

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Queue item not found or not pending' });
  }
  res.json({ ok: true });
});

// Execute a queue item immediately
queueRouter.post('/:id/execute-now', async (req, res) => {
  const queueItem = db.prepare('SELECT * FROM message_queue WHERE id = ?').get(req.params.id) as any;

  if (!queueItem) {
    return res.status(404).json({ error: 'Queue item not found' });
  }

  if (queueItem.status !== 'pending') {
    return res.status(400).json({ error: 'Queue item is not pending' });
  }

  try {
    // Update status to running
    db.prepare('UPDATE message_queue SET status = ? WHERE id = ?')
      .run('running', req.params.id);

    // Execute the message by making internal API call
    const response = await fetch(`http://localhost:${process.env.PORT || 8000}/api/chats/${queueItem.chat_id}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || ''
      },
      body: JSON.stringify({ prompt: queueItem.user_message })
    });

    if (response.ok) {
      db.prepare('UPDATE message_queue SET status = ? WHERE id = ?')
        .run('completed', req.params.id);
      res.json({ success: true, message: 'Message executed successfully' });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error: any) {
    db.prepare('UPDATE message_queue SET status = ?, error_message = ?, retry_count = retry_count + 1 WHERE id = ?')
      .run('failed', error.message, req.params.id);
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming messages (due in next hour)
queueRouter.get('/upcoming/next-hour', (req, res) => {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const upcomingMessages = db.prepare(`
    SELECT * FROM message_queue
    WHERE status = 'pending'
    AND scheduled_time <= ?
    AND scheduled_time >= ?
    ORDER BY scheduled_time ASC
  `).all(nextHour, now);

  res.json(upcomingMessages);
});