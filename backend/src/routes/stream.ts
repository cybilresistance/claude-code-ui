import { Router } from 'express';
import { sendMessage, getActiveSession, stopSession, respondToPermission, hasPendingRequest, getPendingRequest, type StreamEvent } from '../services/claude.js';
import { OpenRouterClient } from '../services/openrouter-client.js';
import db from '../db.js';

export const streamRouter = Router();

/**
 * Generate a chat title from the first user message using OpenRouter,
 * then save it into the chat's metadata JSON.
 */
async function generateAndSaveTitle(chatId: string, prompt: string): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return;

  const client = new OpenRouterClient(apiKey);
  if (!client.isReady()) return;

  const chat = db.prepare('SELECT metadata FROM chats WHERE id = ?').get(chatId) as { metadata: string } | undefined;
  if (!chat) return;

  const meta = JSON.parse(chat.metadata || '{}');
  if (meta.title) return; // already has a title

  const result = await client.generateChatTitle({ userMessage: prompt });
  if (result.success && result.content) {
    meta.title = result.content;
    db.prepare('UPDATE chats SET metadata = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(meta), new Date().toISOString(), chatId);
  }
}

// Send a message and get SSE stream back
streamRouter.post('/:id/message', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    const emitter = await sendMessage(req.params.id, prompt);

    // Fire-and-forget: generate title from first message
    generateAndSaveTitle(req.params.id, prompt).catch(err =>
      console.error('[OpenRouter] Title generation failed:', err)
    );

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const onEvent = (event: StreamEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'done' || event.type === 'error') {
        emitter.removeListener('event', onEvent);
        res.end();
      }
    };

    emitter.on('event', onEvent);

    req.on('close', () => {
      emitter.removeListener('event', onEvent);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SSE endpoint for connecting to an active stream
streamRouter.get('/:id/stream', (req, res) => {
  const session = getActiveSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'No active stream' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const onEvent = (event: StreamEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === 'done' || event.type === 'error') {
      session.emitter.removeListener('event', onEvent);
      res.end();
    }
  };

  session.emitter.on('event', onEvent);

  req.on('close', () => {
    session.emitter.removeListener('event', onEvent);
  });
});

// Check for a pending request (for page refresh reconnection)
streamRouter.get('/:id/pending', (req, res) => {
  const pending = getPendingRequest(req.params.id);
  if (!pending) return res.json({ pending: null });
  res.json({
    pending: {
      type: pending.eventType,
      ...pending.eventData,
    },
  });
});

// Respond to a pending permission/question/plan request
streamRouter.post('/:id/respond', (req, res) => {
  const { allow, updatedInput, updatedPermissions } = req.body;
  if (!hasPendingRequest(req.params.id)) {
    return res.status(404).json({ error: 'No pending request' });
  }
  const ok = respondToPermission(req.params.id, allow, updatedInput, updatedPermissions);
  res.json({ ok });
});

// Stop execution
streamRouter.post('/:id/stop', (_req, res) => {
  const stopped = stopSession(_req.params.id);
  res.json({ stopped });
});
