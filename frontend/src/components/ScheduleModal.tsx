import { useState } from 'react';
import { scheduleMessage } from '../api';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  initialMessage?: string;
}

export default function ScheduleModal({ isOpen, onClose, chatId, initialMessage = '' }: ScheduleModalProps) {
  const [message, setMessage] = useState(initialMessage);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !scheduledTime) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await scheduleMessage(chatId, message.trim(), new Date(scheduledTime).toISOString());
      onClose();
      setMessage('');
      setScheduledTime('');
    } catch (err: any) {
      setError(err.message || 'Failed to schedule message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // At least 1 minute in future
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: 8,
        padding: 24,
        width: '90%',
        maxWidth: 500,
        border: '1px solid var(--border)',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Schedule Message</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Message:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              required
              style={{
                width: '100%',
                minHeight: 80,
                padding: 8,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Schedule for:
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={getMinDateTime()}
              required
              style={{
                width: '100%',
                padding: 8,
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14,
              }}
            />
          </div>

          {error && (
            <div style={{
              color: 'var(--danger)',
              fontSize: 12,
              marginBottom: 16,
              padding: 8,
              background: 'var(--danger-bg, rgba(255, 0, 0, 0.1))',
              borderRadius: 4,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 14,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !message.trim() || !scheduledTime}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 14,
                background: isSubmitting ? 'var(--accent-muted)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
              }}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}