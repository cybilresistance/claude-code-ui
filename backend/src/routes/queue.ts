import { Router } from "express";
import { queueFileService } from "../services/queue-file-service.js";
import { sendMessage, type StreamEvent } from "../services/claude.js";

export const queueRouter = Router();

// Get all queued messages
queueRouter.get("/", (req, res) => {
  // #swagger.tags = ['Queue']
  // #swagger.summary = 'List queue items'
  // #swagger.description = 'Returns all queued messages, optionally filtered by status or chat ID.'
  /* #swagger.parameters['status'] = { in: 'query', type: 'string', description: 'Filter by status (pending, running, failed, draft)' } */
  /* #swagger.parameters['chat_id'] = { in: 'query', type: 'string', description: 'Filter by chat ID' } */
  /* #swagger.responses[200] = { description: "Array of queue items" } */
  const { status, chat_id } = req.query;

  try {
    const queueItems = queueFileService.getAllQueueItems(status as string | undefined, chat_id as string | undefined);
    res.json(queueItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule a new message or create a draft
queueRouter.post("/", (req, res) => {
  // #swagger.tags = ['Queue']
  // #swagger.summary = 'Create queue item or draft'
  // #swagger.description = 'Schedule a message for later execution or save as a draft. For scheduled items, scheduled_time is required. Either chat_id (existing chat) or folder (new chat) must be provided.'
  /* #swagger.requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["user_message"],
          properties: {
            chat_id: { type: "string", description: "Existing chat ID (null for new chat)" },
            user_message: { type: "string", description: "The message to send" },
            scheduled_time: { type: "string", format: "date-time", description: "ISO 8601 time to send (required unless is_draft)" },
            folder: { type: "string", description: "Project folder for new chats" },
            defaultPermissions: { type: "object", description: "Default permissions for new chats" },
            is_draft: { type: "boolean", description: "Save as draft instead of scheduling" }
          }
        }
      }
    }
  } */
  /* #swagger.responses[201] = { description: "Queue item created" } */
  /* #swagger.responses[400] = { description: "Missing required fields" } */
  const { chat_id, user_message, scheduled_time, folder, defaultPermissions, is_draft } = req.body;

  if (!user_message) {
    return res.status(400).json({
      error: "user_message is required",
    });
  }

  // For scheduled items, scheduled_time is required
  if (!is_draft && !scheduled_time) {
    return res.status(400).json({
      error: "scheduled_time is required for non-draft items",
    });
  }

  // For new chats, chat_id can be null but folder is required
  if (!chat_id && !folder) {
    return res.status(400).json({
      error: "Either chat_id or folder is required",
    });
  }

  try {
    const queueItem = queueFileService.createQueueItem(
      chat_id || null,
      user_message,
      scheduled_time || new Date().toISOString(),
      folder,
      defaultPermissions,
      is_draft,
    );
    res.status(201).json(queueItem);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific queue item
queueRouter.get("/:id", (req, res) => {
  // #swagger.tags = ['Queue']
  // #swagger.summary = 'Get queue item'
  // #swagger.description = 'Retrieve a specific queue item by ID.'
  /* #swagger.parameters['id'] = { in: 'path', required: true, type: 'string', description: 'Queue item ID' } */
  /* #swagger.responses[200] = { description: "Queue item details" } */
  /* #swagger.responses[404] = { description: "Queue item not found" } */
  const queueItem = queueFileService.getQueueItem(req.params.id);
  if (!queueItem) {
    return res.status(404).json({ error: "Queue item not found" });
  }
  res.json(queueItem);
});

// Cancel/delete a queue item
queueRouter.delete("/:id", (req, res) => {
  // #swagger.tags = ['Queue']
  // #swagger.summary = 'Delete queue item'
  // #swagger.description = 'Cancel and delete a pending queue item.'
  /* #swagger.parameters['id'] = { in: 'path', required: true, type: 'string', description: 'Queue item ID' } */
  /* #swagger.responses[200] = { description: "Queue item deleted" } */
  /* #swagger.responses[404] = { description: "Queue item not found or not pending" } */
  const queueItem = queueFileService.getQueueItem(req.params.id);

  if (!queueItem || queueItem.status !== "pending") {
    return res.status(404).json({ error: "Queue item not found or not pending" });
  }

  const deleted = queueFileService.deleteQueueItem(req.params.id);
  if (deleted) {
    res.json({ ok: true });
  } else {
    res.status(500).json({ error: "Failed to delete queue item" });
  }
});

// Convert a draft to a scheduled item
queueRouter.post("/:id/convert-to-scheduled", (req, res) => {
  // #swagger.tags = ['Queue']
  // #swagger.summary = 'Convert draft to scheduled'
  // #swagger.description = 'Convert a draft queue item to a scheduled item with a specified time.'
  /* #swagger.parameters['id'] = { in: 'path', required: true, type: 'string', description: 'Queue item ID' } */
  /* #swagger.requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["scheduled_time"],
          properties: {
            scheduled_time: { type: "string", format: "date-time", description: "ISO 8601 time to schedule" }
          }
        }
      }
    }
  } */
  /* #swagger.responses[200] = { description: "Draft converted" } */
  /* #swagger.responses[404] = { description: "Draft not found or cannot be converted" } */
  const { scheduled_time } = req.body;

  if (!scheduled_time) {
    return res.status(400).json({ error: "scheduled_time is required" });
  }

  const converted = queueFileService.convertDraftToScheduled(req.params.id, scheduled_time);

  if (converted) {
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "Draft not found or cannot be converted" });
  }
});

// Execute a queue item immediately
queueRouter.post("/:id/execute-now", async (req, res) => {
  // #swagger.tags = ['Queue']
  // #swagger.summary = 'Execute queue item now'
  // #swagger.description = 'Immediately execute a pending or draft queue item. Makes an internal API call to send the message.'
  /* #swagger.parameters['id'] = { in: 'path', required: true, type: 'string', description: 'Queue item ID' } */
  /* #swagger.responses[200] = { description: "Execution started" } */
  /* #swagger.responses[400] = { description: "Queue item not pending or draft" } */
  /* #swagger.responses[404] = { description: "Queue item not found" } */
  const queueItem = queueFileService.getQueueItem(req.params.id);

  if (!queueItem) {
    return res.status(404).json({ error: "Queue item not found" });
  }

  if (queueItem.status !== "pending" && queueItem.status !== "draft") {
    return res.status(400).json({ error: "Queue item is not pending or draft" });
  }

  try {
    // Update status to running
    queueFileService.updateQueueItem(req.params.id, { status: "running" });

    // Call the service layer directly instead of making HTTP requests
    const emitter = await sendMessage(
      queueItem.chat_id
        ? { chatId: queueItem.chat_id, prompt: queueItem.user_message }
        : {
            folder: queueItem.folder!,
            prompt: queueItem.user_message,
            defaultPermissions: queueItem.defaultPermissions,
          },
    );

    // Wait for the session to complete or error
    await new Promise<void>((resolve, reject) => {
      const onEvent = (event: StreamEvent) => {
        if (event.type === "done") {
          emitter.removeListener("event", onEvent);
          resolve();
        } else if (event.type === "error") {
          emitter.removeListener("event", onEvent);
          reject(new Error(event.content || "Unknown stream error"));
        }
      };
      emitter.on("event", onEvent);
    });

    // Delete the queue item when completed successfully
    queueFileService.deleteQueueItem(req.params.id);
    res.json({ success: true, message: "Message executed successfully" });
  } catch (error: any) {
    queueFileService.updateQueueItem(req.params.id, {
      status: "failed",
      error_message: error.message,
      retry_count: queueItem.retry_count + 1,
    });
    res.status(500).json({ error: error.message });
  }
});
