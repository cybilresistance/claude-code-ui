import { useState, useRef, useCallback } from 'react';
import ImageUpload from './ImageUpload';

interface Props {
  onSend: (prompt: string, images?: File[]) => void;
  disabled: boolean;
  onSchedule?: (prompt: string, images?: File[]) => void;
  onBacklog?: (prompt: string, images?: File[]) => void;
}

export default function PromptInput({ onSend, disabled, onSchedule, onBacklog }: Props) {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if ((!trimmed && images.length === 0) || disabled) return;

    // Send message with images
    onSend(trimmed, images.length > 0 ? images : undefined);

    // Clear input and images
    setValue('');
    setImages([]);
    setShowImageUpload(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, images, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  const toggleImageUpload = () => {
    setShowImageUpload(!showImageUpload);
  };

  const handleSchedule = useCallback(() => {
    if (!onSchedule || disabled) return;
    onSchedule(value.trim(), images.length > 0 ? images : undefined);
  }, [value, images, disabled, onSchedule]);

  const handleBacklog = useCallback(async () => {
    const trimmed = value.trim();
    if (!onBacklog || !trimmed || disabled) return;

    // Add to backlog and clear input
    onBacklog(trimmed, images.length > 0 ? images : undefined);
    setValue('');
    setImages([]);
    setShowImageUpload(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, images, disabled, onBacklog]);

  const canSend = (value.trim() || images.length > 0) && !disabled;

  return (
    <div style={{
      padding: '8px 12px',
      paddingBottom: 'calc(8px + var(--safe-bottom))',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      flexShrink: 0,
    }}>
      {/* Image upload area */}
      {showImageUpload && (
        <div style={{ marginBottom: 8 }}>
          <ImageUpload
            images={images}
            onImagesChange={setImages}
            disabled={disabled}
          />
        </div>
      )}

      {/* Message input area */}
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={images.length > 0 ? "Add a message (optional)..." : "Send a message..."}
            disabled={disabled}
            rows={1}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 40px 10px 14px',
              fontSize: 15,
              resize: 'none',
              maxHeight: 120,
              lineHeight: 1.4,
            }}
          />

          {/* Image attachment button */}
          <button
            onClick={toggleImageUpload}
            disabled={disabled}
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              width: 24,
              height: 24,
              borderRadius: 6,
              background: showImageUpload ? 'var(--accent)' : 'var(--border)',
              color: showImageUpload ? '#fff' : 'var(--text-muted)',
              border: 'none',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            title={showImageUpload ? 'Hide image upload' : 'Upload images'}
          >
            📎
          </button>
        </div>

        {/* Backlog button */}
        {onBacklog && (
          <button
            onClick={handleBacklog}
            disabled={!value.trim() || disabled}
            style={{
              background: !value.trim() || disabled ? 'var(--border)' : 'var(--bg-secondary)',
              color: !value.trim() || disabled ? 'var(--text-muted)' : 'var(--text)',
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
              border: '1px solid var(--border)',
              cursor: !value.trim() || disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            title="Add to backlog"
          >
            📝
          </button>
        )}

        {/* Schedule button */}
        {onSchedule && (
          <button
            onClick={handleSchedule}
            disabled={disabled}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
              border: '1px solid var(--border)',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            title="Schedule message"
          >
            ⏰
          </button>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            background: !canSend ? 'var(--border)' : 'var(--accent)',
            color: '#fff',
            width: 40,
            height: 40,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            border: 'none',
            cursor: !canSend ? 'default' : 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          ↑
        </button>
      </div>

      {/* Image count indicator */}
      {images.length > 0 && (
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 4,
          textAlign: 'center' as const,
        }}>
          {images.length} image{images.length === 1 ? '' : 's'} selected
        </div>
      )}
    </div>
  );
}
