import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQueueItems, cancelQueueItem, executeNow, type QueueItem } from '../api';

export default function Queue() {
  const navigate = useNavigate();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [error, setError] = useState<string | null>(null);

  const loadQueueItems = useCallback(async (status?: string) => {
    try {
      setLoading(true);
      const items = await getQueueItems(status);
      setQueueItems(items);
    } catch (err: any) {
      setError(err.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueueItems(activeTab === 'all' ? undefined : activeTab);
  }, [activeTab, loadQueueItems]);

  const handleCancel = useCallback(async (id: string) => {
    try {
      await cancelQueueItem(id);
      await loadQueueItems(activeTab === 'all' ? undefined : activeTab);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel item');
    }
  }, [activeTab, loadQueueItems]);

  const handleExecuteNow = useCallback(async (id: string) => {
    try {
      await executeNow(id);
      await loadQueueItems(activeTab === 'all' ? undefined : activeTab);
    } catch (err: any) {
      setError(err.message || 'Failed to execute item');
    }
  }, [activeTab, loadQueueItems]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const tabs = [
    { key: 'pending', label: 'Pending', count: queueItems.filter(i => i.status === 'pending').length },
    { key: 'running', label: 'Running', count: queueItems.filter(i => i.status === 'running').length },
    { key: 'completed', label: 'Completed', count: queueItems.filter(i => i.status === 'completed').length },
    { key: 'failed', label: 'Failed', count: queueItems.filter(i => i.status === 'failed').length },
    { key: 'all', label: 'All', count: queueItems.length },
  ];

  const filteredItems = activeTab === 'all'
    ? queueItems
    : queueItems.filter(item => item.status === activeTab);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', fontSize: 18, padding: '4px 8px' }}
        >
          ←
        </button>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Message Queue</div>
        <button
          onClick={() => loadQueueItems(activeTab === 'all' ? undefined : activeTab)}
          style={{
            marginLeft: 'auto',
            background: 'var(--accent)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          🔄 Refresh
        </button>
      </header>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: activeTab === tab.key ? 'var(--bg)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {error && (
          <div style={{
            color: 'var(--danger)',
            background: 'var(--danger-bg, rgba(255, 0, 0, 0.1))',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No {activeTab === 'all' ? '' : activeTab} messages in queue
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredItems.map(item => (
              <div
                key={item.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  background: 'var(--bg)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: getStatusColor(item.status),
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase' }}>
                        {item.status}
                      </span>
                      {item.retry_count > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          (Retry #{item.retry_count})
                        </span>
                      )}
                    </div>

                    <div style={{
                      background: 'var(--surface)',
                      padding: 12,
                      borderRadius: 6,
                      marginBottom: 12,
                      fontSize: 14,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 120,
                      overflow: 'auto',
                    }}>
                      {item.user_message}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>Scheduled: {formatTime(item.scheduled_time)}</span>
                      <span>Created: {formatTime(item.created_at)}</span>
                      <span>Chat ID: {item.chat_id}</span>
                    </div>

                    {item.error_message && (
                      <div style={{
                        marginTop: 8,
                        padding: 8,
                        background: 'var(--danger-bg, rgba(255, 0, 0, 0.1))',
                        borderRadius: 4,
                        fontSize: 12,
                        color: 'var(--danger)',
                      }}>
                        Error: {item.error_message}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleExecuteNow(item.id)}
                          style={{
                            background: 'var(--accent)',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: 4,
                            fontSize: 12,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Execute Now
                        </button>
                        <button
                          onClick={() => handleCancel(item.id)}
                          style={{
                            background: 'var(--danger)',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: 4,
                            fontSize: 12,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(`/chat/${item.chat_id}`)}
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text)',
                        padding: '6px 12px',
                        borderRadius: 4,
                        fontSize: 12,
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      View Chat
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}