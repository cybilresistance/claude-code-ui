import db from '../db.js';

export class QueueProcessor {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private checkInterval = 30000; // Check every 30 seconds

  start() {
    if (this.intervalId) return;

    console.log('Starting queue processor...');
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
      console.log('Queue processor stopped');
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const dueMessages = this.getDueMessages();

      for (const message of dueMessages) {
        await this.executeMessage(message);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private getDueMessages(): any[] {
    const now = new Date().toISOString();
    return db.prepare(`
      SELECT * FROM message_queue
      WHERE status = 'pending'
      AND scheduled_time <= ?
      ORDER BY scheduled_time ASC
      LIMIT 10
    `).all(now);
  }

  private async executeMessage(queueItem: any): Promise<void> {
    const { id, chat_id, user_message } = queueItem;

    try {
      // Update status to running
      db.prepare('UPDATE message_queue SET status = ? WHERE id = ?')
        .run('running', id);

      // Execute the message
      const response = await fetch(`http://localhost:${process.env.PORT || 8000}/api/chats/${chat_id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add proper authentication for internal requests
        },
        body: JSON.stringify({ prompt: user_message })
      });

      if (response.ok) {
        // Mark as completed
        db.prepare('UPDATE message_queue SET status = ? WHERE id = ?')
          .run('completed', id);
        console.log(`Queue item ${id} executed successfully`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error(`Failed to execute queue item ${id}:`, error.message);

      // Update retry count and status
      const retryCount = queueItem.retry_count + 1;
      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        db.prepare('UPDATE message_queue SET status = ?, error_message = ?, retry_count = ? WHERE id = ?')
          .run('failed', error.message, retryCount, id);
        console.log(`Queue item ${id} failed after ${maxRetries} attempts`);
      } else {
        // Schedule for retry (exponential backoff)
        const retryDelay = Math.pow(2, retryCount) * 60 * 1000; // 2^n minutes
        const retryTime = new Date(Date.now() + retryDelay).toISOString();

        db.prepare('UPDATE message_queue SET status = ?, error_message = ?, retry_count = ?, scheduled_time = ? WHERE id = ?')
          .run('pending', error.message, retryCount, retryTime, id);
        console.log(`Queue item ${id} scheduled for retry in ${retryDelay / 60000} minutes`);
      }
    }
  }
}

// Global instance
export const queueProcessor = new QueueProcessor();