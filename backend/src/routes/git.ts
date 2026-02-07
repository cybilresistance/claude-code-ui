import { Router } from "express";
import { existsSync } from "fs";
import { getGitBranches, getGitWorktrees, removeWorktree } from "../utils/git.js";

export const gitRouter = Router();

/**
 * List local branches for a git repository.
 * Returns branches sorted alphabetically with the current branch first.
 */
gitRouter.get("/branches", (req, res) => {
  const folder = req.query.folder as string;
  if (!folder) return res.status(400).json({ error: "folder query param is required" });
  if (!existsSync(folder)) return res.status(400).json({ error: "folder does not exist" });

  try {
    const branches = getGitBranches(folder);
    res.json({ branches });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list branches", details: err.message });
  }
});

/**
 * List all git worktrees for a repository.
 */
gitRouter.get("/worktrees", (req, res) => {
  const folder = req.query.folder as string;
  if (!folder) return res.status(400).json({ error: "folder query param is required" });
  if (!existsSync(folder)) return res.status(400).json({ error: "folder does not exist" });

  try {
    const worktrees = getGitWorktrees(folder);
    res.json({ worktrees });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list worktrees", details: err.message });
  }
});

/**
 * Remove a git worktree and prune stale references.
 */
gitRouter.delete("/worktrees", (req, res) => {
  const { folder, worktreePath, force } = req.body;
  if (!folder) return res.status(400).json({ error: "folder is required" });
  if (!worktreePath) return res.status(400).json({ error: "worktreePath is required" });
  if (!existsSync(folder)) return res.status(400).json({ error: "folder does not exist" });

  try {
    removeWorktree(folder, worktreePath, !!force);
    res.json({ ok: true, removed: worktreePath });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to remove worktree", details: err.message });
  }
});
