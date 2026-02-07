import type { DefaultPermissions } from "./permissions.js";

export interface QueueItem {
  id: string;
  chat_id: string | null;
  user_message: string;
  scheduled_time: string;
  status: "draft" | "pending" | "running" | "completed" | "failed";
  created_at: string;
  retry_count: number;
  error_message: string | null;
  // New chat fields - only used when chat_id is null
  folder?: string;
  defaultPermissions?: DefaultPermissions;
}
