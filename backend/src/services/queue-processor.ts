import { queueFileService, type QueueItem } from "./queue-file-service.js";
import { sendMessage, type StreamEvent } from "./claude.js";

export class QueueProcessor {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private checkInterval = 30000; // Check every 30 seconds

  start() {
    if (this.intervalId) return;

    console.log("Starting queue processor...");
    this.intervalId = setInterval(() => {
      this.processQueue().catch(console.error);
    }, this.checkInterval);

    // Process immediately on start
    this.processQueue().catch(console.error);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Queue processor stopped");
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const dueMessages = queueFileService.getDueMessages(10);

      for (const message of dueMessages) {
        await this.executeMessage(message);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeMessage(queueItem: QueueItem): Promise<void> {
    const { id, chat_id, user_message, folder, defaultPermissions } = queueItem;

    try {
      // Update status to running
      queueFileService.updateQueueItem(id, { status: "running" });

      // Call the service layer directly instead of making HTTP requests
      const emitter = await sendMessage(
        chat_id
          ? { chatId: chat_id, prompt: user_message }
          : {
              folder: folder!,
              prompt: user_message,
              defaultPermissions,
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
      queueFileService.deleteQueueItem(id);
      console.log(`Queue item ${id} executed successfully and removed from queue`);
    } catch (error: any) {
      console.error(`Failed to execute queue item ${id}:`, error.message);

      // Update retry count and status
      const retryCount = queueItem.retry_count + 1;
      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        queueFileService.updateQueueItem(id, {
          status: "failed",
          error_message: error.message,
          retry_count: retryCount,
        });
        console.log(`Queue item ${id} failed after ${maxRetries} attempts`);
      } else {
        // Schedule for retry (exponential backoff)
        const retryDelay = Math.pow(2, retryCount) * 60 * 1000; // 2^n minutes
        const retryTime = new Date(Date.now() + retryDelay).toISOString();

        queueFileService.updateQueueItem(id, {
          status: "pending",
          error_message: error.message,
          retry_count: retryCount,
          scheduled_time: retryTime,
        });
        console.log(`Queue item ${id} scheduled for retry in ${retryDelay / 60000} minutes`);
      }
    }
  }
}

// Global instance
export const queueProcessor = new QueueProcessor();
