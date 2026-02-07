import { statSync } from "fs";
import { join } from "path";
import { chatFileService } from "../services/chat-file-service.js";
import { getGitInfo } from "./git.js";
import { projectDirToFolder } from "./paths.js";
import { findSessionLogPath } from "./session-log.js";

/**
 * Look up a chat by ID, checking file storage first then falling back to filesystem.
 * Returns null if chat not found in either location. Does not throw errors.
 *
 * Used by both chats.ts and stream.ts routes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findChat(id: string, includeGitInfo: boolean = true): any | null {
  try {
    // Try file storage first
    let fileChat = null;
    try {
      fileChat = chatFileService.getChat(id);
    } catch (err) {
      console.error("Error reading chat from file storage:", err);
    }

    if (fileChat) {
      const logPath = findSessionLogPath(fileChat.session_id);
      let gitInfo: { isGitRepo: boolean; branch?: string } = { isGitRepo: false };
      if (includeGitInfo) {
        try {
          gitInfo = getGitInfo(fileChat.folder);
        } catch {}
      }
      return {
        ...fileChat,
        session_log_path: logPath,
        ...(includeGitInfo && {
          is_git_repo: gitInfo.isGitRepo,
          git_branch: gitInfo.branch,
        }),
      };
    }

    // Try filesystem fallback: id might be a session ID with no file storage
    const logPath = findSessionLogPath(id);
    if (!logPath) return null;

    const projectDir = join(logPath, "..");
    const dirName = projectDir.split("/").pop()!;
    const st = statSync(logPath);
    const folder = projectDirToFolder(dirName);
    let gitInfo: { isGitRepo: boolean; branch?: string } = { isGitRepo: false };
    if (includeGitInfo) {
      try {
        gitInfo = getGitInfo(folder);
      } catch {}
    }

    return {
      id,
      folder,
      session_id: id,
      session_log_path: logPath,
      metadata: JSON.stringify({ session_ids: [id] }),
      created_at: st.birthtime.toISOString(),
      updated_at: st.mtime.toISOString(),
      ...(includeGitInfo && {
        is_git_repo: gitInfo.isGitRepo,
        git_branch: gitInfo.branch,
      }),
      _from_filesystem: true,
    };
  } catch (err) {
    console.error("Error finding chat:", err);
    return null;
  }
}

/**
 * Lightweight chat lookup for status checks — skips git info for performance.
 * Used by stream.ts for session status checks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findChatForStatus(id: string): any | null {
  return findChat(id, false);
}
