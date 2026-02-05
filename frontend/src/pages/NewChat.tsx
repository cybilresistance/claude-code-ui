import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Slash } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { getNewChatInfo, type NewChatInfo, type DefaultPermissions } from '../api';
import PromptInput from '../components/PromptInput';
import FeedbackPanel, { type PendingAction } from '../components/FeedbackPanel';
import SlashCommandsModal from '../components/SlashCommandsModal';
import { addRecentDirectory } from '../utils/localStorage';

interface NewChatProps {
  onChatListRefresh?: () => void;
}

export default function NewChat({ onChatListRefresh }: NewChatProps = {}) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const folder = searchParams.get('folder') || '';
  const defaultPermissions = (location.state as any)?.defaultPermissions as DefaultPermissions | undefined;

  const [info, setInfo] = useState<NewChatInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [inFlightMessage, setInFlightMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [slashCommands, setSlashCommands] = useState<string[]>([]);
  const [showSlashCommandsModal, setShowSlashCommandsModal] = useState(false);
  const [promptInputSetValue, setPromptInputSetValue] = useState<((value: string) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tempChatIdRef = useRef<string | null>(null);

  // Load folder info on mount
  useEffect(() => {
    if (!folder) {
      setError('No folder specified');
      return;
    }

    getNewChatInfo(folder)
      .then(data => {
        setInfo(data);
        if (data.slash_commands) {
          setSlashCommands(data.slash_commands.map(cmd =>
            typeof cmd === 'string' ? cmd : cmd.name
          ));
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to load folder info');
      });
  }, [folder]);

  const handleSend = useCallback(async (prompt: string, images?: File[]) => {
    if (!folder) return;

    // TODO: Handle image upload for new chats
    // For now, we'll skip images in the initial implementation

    setInFlightMessage(prompt);
    setError(null);

    // Track directory usage
    addRecentDirectory(folder);

    // Abort any existing request
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chats/new/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folder, prompt, defaultPermissions }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Failed to send message');
        setStreaming(false);
        setInFlightMessage(null);
        return;
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            // Handle chat_created - navigate to the real chat
            if (event.type === 'chat_created' && event.chatId) {
              tempChatIdRef.current = event.chatId;
              // Navigate immediately but keep the stream going
              navigate(`/chat/${event.chatId}`, { replace: true });
              // Refresh chat list to show the new chat
              if (onChatListRefresh) {
                onChatListRefresh();
              }
              // The Chat component will auto-connect to the active session
              return;
            }

            if (event.type === 'message_complete') {
              setStreaming(false);
              setInFlightMessage(null);
              return;
            }

            if (event.type === 'message_error') {
              setStreaming(false);
              setInFlightMessage(null);
              setError(event.content || 'An error occurred');
              return;
            }

            if (event.type === 'permission_request' || event.type === 'user_question' || event.type === 'plan_review') {
              setPendingAction({
                type: event.type,
                toolName: event.toolName,
                input: event.input,
                questions: event.questions,
                suggestions: event.suggestions,
                content: event.content,
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Network error');
        setStreaming(false);
        setInFlightMessage(null);
      }
    } finally {
      if (abortRef.current === controller) {
        setStreaming(false);
        setInFlightMessage(null);
        abortRef.current = null;
      }
    }
  }, [folder, defaultPermissions, navigate, onChatListRefresh]);

  const handleRespond = useCallback(async (allow: boolean, updatedInput?: Record<string, unknown>) => {
    // For new chats, we need to respond using the temp chat ID
    // This is tricky because we don't have a real chat ID yet
    // For now, just clear the pending action - the session should handle it
    setPendingAction(null);

    // TODO: Implement proper permission response for new chats
    // This would require tracking the temp session ID and responding to it
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setInFlightMessage(null);
    setPendingAction(null);
  }, []);

  const handleCommandSelect = useCallback((command: string) => {
    if (promptInputSetValue) {
      promptInputSetValue(command);
    }
  }, [promptInputSetValue]);

  if (!folder) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No folder specified. Please select a folder from the chat list.</p>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        {isMobile && (
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Back to chat list"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {info?.is_git_repo ? (info.git_branch || 'main') : (folder.split('/').pop() || 'New Chat')}
            </div>
            <div style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 500,
            }}>
              New
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folder}
          </div>
        </div>

        {slashCommands.length > 0 && (
          <button
            onClick={() => setShowSlashCommandsModal(true)}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text)',
              padding: '8px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="View available slash commands"
          >
            <Slash size={16} />
          </button>
        )}
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {error && (
          <div style={{
            color: 'var(--danger)',
            background: 'var(--danger-bg, rgba(255, 0, 0, 0.1))',
            padding: '12px 16px',
            borderRadius: 6,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {!streaming && !error && (
          <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto' }}>
            {/* Folder info */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              padding: '20px 24px',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Working Directory</div>
              <div style={{ fontSize: 15, fontWeight: 500, wordBreak: 'break-all' }}>{folder}</div>
              {info?.is_git_repo && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: '#10b981',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                  }}>Git</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Branch: <strong style={{ color: 'var(--text)' }}>{info.git_branch || 'main'}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Slash commands if available */}
            {slashCommands.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Available Commands</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slashCommands.slice(0, 8).map((cmd, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (promptInputSetValue) {
                          promptInputSetValue(cmd);
                        }
                      }}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 13,
                        color: 'var(--accent)',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                      }}
                    >
                      {cmd}
                    </button>
                  ))}
                  {slashCommands.length > 8 && (
                    <button
                      onClick={() => setShowSlashCommandsModal(true)}
                      style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '6px 12px',
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      +{slashCommands.length - 8} more
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Getting started hint */}
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 14 }}>
              Send a message to start coding with Claude.
            </p>
          </div>
        )}

        {inFlightMessage && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            margin: '6px 0',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              background: 'var(--user-bg)',
              border: '1px solid transparent',
              fontSize: 14,
              lineHeight: 1.5,
              wordBreak: 'break-word',
              opacity: 0.7,
            }}>
              {inFlightMessage}
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              opacity: 0.5,
              marginTop: 4,
              textAlign: 'right',
            }}>
              Sending...
            </div>
          </div>
        )}

        {streaming && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
            Starting chat session...
          </div>
        )}
      </div>

      {pendingAction ? (
        <FeedbackPanel action={pendingAction} onRespond={handleRespond} />
      ) : (
        <PromptInput
          onSend={handleSend}
          disabled={streaming}
          slashCommands={slashCommands}
          onSetValue={setPromptInputSetValue}
        />
      )}

      <SlashCommandsModal
        isOpen={showSlashCommandsModal}
        onClose={() => setShowSlashCommandsModal(false)}
        slashCommands={slashCommands}
        onCommandSelect={handleCommandSelect}
      />
    </div>
  );
}
