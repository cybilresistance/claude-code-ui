import type {
  SlashCommand,
  PluginCommand,
  PluginManifest,
  Plugin,
  Chat,
  ParsedMessage,
  ChatListResponse,
  PermissionLevel,
  DefaultPermissions,
  StoredImage,
  ImageUploadResult,
  QueueItem,
  SessionStatus,
  BranchConfig,
} from "shared/types/index.js";

export type {
  SlashCommand,
  PluginCommand,
  PluginManifest,
  Plugin,
  Chat,
  ParsedMessage,
  ChatListResponse,
  PermissionLevel,
  DefaultPermissions,
  StoredImage,
  ImageUploadResult,
  QueueItem,
  SessionStatus,
  BranchConfig,
};

const BASE = "/api";

export async function listChats(limit?: number, offset?: number): Promise<ChatListResponse> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.append("limit", limit.toString());
  if (offset !== undefined) params.append("offset", offset.toString());

  const res = await fetch(`${BASE}/chats${params.toString() ? `?${params}` : ""}`);
  return res.json();
}

export interface NewChatInfo {
  folder: string;
  is_git_repo: boolean;
  git_branch?: string;
  slash_commands: SlashCommand[];
  plugins: Plugin[];
}

export async function getNewChatInfo(folder: string): Promise<NewChatInfo> {
  const res = await fetch(`${BASE}/chats/new/info?folder=${encodeURIComponent(folder)}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to get chat info");
  }
  return res.json();
}

export async function deleteChat(id: string): Promise<void> {
  await fetch(`${BASE}/chats/${id}`, { method: "DELETE" });
}

export async function getChat(id: string): Promise<Chat> {
  const res = await fetch(`${BASE}/chats/${id}`);
  return res.json();
}

export async function getMessages(id: string): Promise<ParsedMessage[]> {
  const res = await fetch(`${BASE}/chats/${id}/messages`);
  return res.json();
}

export async function getPending(id: string): Promise<any | null> {
  const res = await fetch(`${BASE}/chats/${id}/pending`);
  const data = await res.json();
  return data.pending;
}

export async function respondToChat(
  id: string,
  allow: boolean,
  updatedInput?: Record<string, unknown>,
  updatedPermissions?: unknown[],
): Promise<{ ok: boolean; toolName?: string }> {
  const res = await fetch(`${BASE}/chats/${id}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allow, updatedInput, updatedPermissions }),
  });
  if (!res.ok) {
    return { ok: false };
  }
  return res.json();
}

export async function getSessionStatus(id: string): Promise<SessionStatus> {
  const res = await fetch(`${BASE}/chats/${id}/status`, { credentials: "include" });
  return res.json();
}

export async function uploadImages(chatId: string, images: File[]): Promise<ImageUploadResult> {
  const formData = new FormData();
  images.forEach((image) => {
    formData.append("images", image);
  });

  const res = await fetch(`${BASE}/chats/${chatId}/images`, {
    method: "POST",
    body: formData,
  });

  return res.json();
}

// Queue API functions
export async function getQueueItems(status?: string, chatId?: string): Promise<QueueItem[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (chatId) params.append("chat_id", chatId);

  const res = await fetch(`${BASE}/queue?${params}`);
  return res.json();
}

export async function scheduleMessage(
  chatId: string | null,
  message: string,
  scheduledTime: string,
  folder?: string,
  defaultPermissions?: DefaultPermissions,
): Promise<QueueItem> {
  const res = await fetch(`${BASE}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_message: message,
      scheduled_time: scheduledTime,
      is_draft: false,
      ...(folder && { folder }),
      ...(defaultPermissions && { defaultPermissions }),
    }),
  });
  return res.json();
}

export async function createDraft(chatId: string | null, message: string, folder?: string, defaultPermissions?: DefaultPermissions): Promise<QueueItem> {
  const res = await fetch(`${BASE}/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_message: message,
      is_draft: true,
      ...(folder && { folder }),
      ...(defaultPermissions && { defaultPermissions }),
    }),
  });
  return res.json();
}

export async function convertDraftToScheduled(id: string, scheduledTime: string): Promise<void> {
  await fetch(`${BASE}/queue/${id}/convert-to-scheduled`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduled_time: scheduledTime }),
  });
}

export async function cancelQueueItem(id: string): Promise<void> {
  await fetch(`${BASE}/queue/${id}`, { method: "DELETE" });
}

export async function executeNow(id: string): Promise<void> {
  await fetch(`${BASE}/queue/${id}/execute-now`, { method: "POST" });
}

export async function getSlashCommandsAndPlugins(chatId: string): Promise<{ slashCommands: string[]; plugins: Plugin[] }> {
  const res = await fetch(`${BASE}/chats/${chatId}/slash-commands`);
  const data = await res.json();
  return {
    slashCommands: data.slashCommands || [],
    plugins: data.plugins || [],
  };
}

// Branch / worktree configuration
export async function getGitBranches(folder: string): Promise<{ branches: string[] }> {
  const res = await fetch(`${BASE}/git/branches?folder=${encodeURIComponent(folder)}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to list branches");
  }
  return res.json();
}

export async function getGitDiff(folder: string): Promise<{ diff: string }> {
  const res = await fetch(`${BASE}/git/diff?folder=${encodeURIComponent(folder)}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to get diff");
  }
  return res.json();
}
