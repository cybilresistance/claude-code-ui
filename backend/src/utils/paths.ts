import { statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

/** Absolute path to the project data directory (stable across dev/prod). */
export const DATA_DIR = join(process.cwd(), "data");

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Convert a project directory name back to a folder path.
 * The SDK encodes paths by replacing / with -, so "-home-cybil-my-app"
 * is ambiguous (could be /home/cybil/my-app or /home/cybil/my/app).
 *
 * Uses a greedy left-to-right algorithm: at each dash boundary, check if
 * treating it as a "/" yields an existing directory. If so, commit the split.
 * Otherwise, keep it as a "-" in the current segment. This is O(n) filesystem
 * checks instead of the previous O(2^n) brute-force approach.
 */
export function projectDirToFolder(dirName: string): string {
  // Strip leading dash (represents the root /)
  const parts = dirName.slice(1).split("-");
  if (parts.length === 0) return "/";

  // Build the path greedily from left to right
  const resolvedSegments: string[] = [];
  let currentSegment = parts[0];

  for (let i = 1; i < parts.length; i++) {
    // Try treating the dash as a "/" — does the path so far exist as a directory?
    const candidatePath = "/" + [...resolvedSegments, currentSegment].join("/");
    if (isDirectory(candidatePath)) {
      // Commit this segment and start a new one
      resolvedSegments.push(currentSegment);
      currentSegment = parts[i];
    } else {
      // Keep the dash as a literal "-" in the current segment
      currentSegment += "-" + parts[i];
    }
  }

  // Append the final segment (doesn't need to be a directory itself)
  resolvedSegments.push(currentSegment);

  const resolved = "/" + resolvedSegments.join("/");

  // Verify the final path exists; if not, return it anyway (best effort)
  return resolved;
}
