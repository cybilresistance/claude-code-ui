import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { CLAUDE_PROJECTS_DIR } from "./paths.js";

/**
 * Find the session JSONL file in ~/.claude/projects/.
 * The SDK names project dirs by replacing / with - in the cwd.
 * We search all project dirs for the session ID since the SDK may
 * resolve the cwd differently than what we passed.
 */
export function findSessionLogPath(sessionId: string): string | null {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) return null;
  try {
    for (const dir of readdirSync(CLAUDE_PROJECTS_DIR)) {
      const candidate = join(CLAUDE_PROJECTS_DIR, dir, `${sessionId}.jsonl`);
      if (existsSync(candidate)) return candidate;
    }
  } catch {
    // Silently handle errors (directory not accessible, etc.)
  }
  return null;
}
