import { useState, useEffect, useCallback, useMemo } from "react";
import { GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import { getGitBranches, type BranchConfig } from "../api";

/**
 * Validate a git branch name according to git-check-ref-format rules.
 * Returns an error message string, or null if the name is valid.
 */
function validateBranchName(name: string): string | null {
  if (!name) return null; // empty is fine (field is optional)
  if (/\s/.test(name)) return "Branch name cannot contain spaces";
  if (/\.\./.test(name)) return 'Branch name cannot contain ".."';
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f~^:?*\\]/.test(name)) return "Branch name contains invalid characters";
  if (name.startsWith("/") || name.endsWith("/") || name.endsWith(".")) return 'Branch name cannot start/end with "/" or end with "."';
  if (name.includes("@{")) return 'Branch name cannot contain "@{"';
  if (name.includes("//")) return "Branch name cannot contain consecutive slashes";
  if (name.endsWith(".lock")) return 'Branch name cannot end with ".lock"';
  if (name === "@") return '"@" is not a valid branch name';
  return null;
}

interface BranchSelectorProps {
  folder: string;
  currentBranch: string;
  onChange: (config: BranchConfig) => void;
}

export default function BranchSelector({ folder, currentBranch, onChange }: BranchSelectorProps) {
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [baseBranch, setBaseBranch] = useState(currentBranch);
  const [newBranch, setNewBranch] = useState("");
  const [useWorktree, setUseWorktree] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Fetch branches on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    getGitBranches(folder)
      .then((data) => {
        setBranches(data.branches);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [folder]);

  // Reset base branch when currentBranch changes
  useEffect(() => {
    setBaseBranch(currentBranch);
  }, [currentBranch]);

  // Propagate changes to parent
  const propagateChange = useCallback(
    (base: string, newBr: string, worktree: boolean) => {
      const config: BranchConfig = {};

      if (newBr.trim()) {
        config.baseBranch = base;
        config.newBranch = newBr.trim();
      } else if (base !== currentBranch) {
        config.baseBranch = base;
      }

      if (worktree) {
        config.useWorktree = true;
        // Always include baseBranch when using worktree so the backend knows context
        if (!config.baseBranch) {
          config.baseBranch = base;
        }
      }

      onChange(config);
    },
    [currentBranch, onChange],
  );

  // Validate new branch name
  const branchError = useMemo(() => validateBranchName(newBranch.trim()), [newBranch]);

  // Propagate on state changes (skip if branch name is invalid)
  useEffect(() => {
    if (branchError) return;
    propagateChange(baseBranch, newBranch, useWorktree);
  }, [baseBranch, newBranch, useWorktree, propagateChange, branchError]);

  // Compute worktree path preview
  const effectiveBranch = newBranch.trim() || baseBranch;
  const sanitized = effectiveBranch.replace(/\//g, "-");
  const repoName = folder.split("/").pop() || "repo";
  const parentDir = folder.split("/").slice(0, -1).join("/");
  const worktreePath = `${parentDir}/${repoName}.${sanitized}`;

  // Determine display label for collapsed state
  const hasChanges = baseBranch !== currentBranch || newBranch.trim() || useWorktree;
  const displayLabel = newBranch.trim() ? `${newBranch.trim()} (new from ${baseBranch})` : baseBranch;

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        borderRadius: 12,
        padding: expanded ? "16px 20px" : "10px 16px",
        marginBottom: 16,
        border: hasChanges ? "1px solid var(--accent)" : "1px solid transparent",
        transition: "all 0.2s ease",
      }}
    >
      {/* Header / collapsed view */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: "var(--text)",
        }}
      >
        <GitBranch size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayLabel}
        </span>
        {useWorktree && (
          <span
            style={{
              fontSize: 10,
              color: "#fff",
              background: "var(--accent)",
              padding: "2px 6px",
              borderRadius: 4,
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            worktree
          </span>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
          {expanded ? (
            <>
              Hide <ChevronUp size={12} style={{ verticalAlign: "middle" }} />
            </>
          ) : (
            <>
              Configure <ChevronDown size={12} style={{ verticalAlign: "middle" }} />
            </>
          )}
        </span>
      </button>

      {/* Expanded controls */}
      {expanded && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Base Branch */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              Base Branch
            </label>
            {loading ? (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading branches...</span>
            ) : error ? (
              <span style={{ fontSize: 12, color: "var(--danger, #ef4444)" }}>{error}</span>
            ) : (
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 13,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                    {branch === currentBranch ? " (current)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* New Branch */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              New Branch <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional — extends base)</span>
            </label>
            <input
              type="text"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              placeholder="e.g. feature/my-feature"
              style={{
                width: "100%",
                background: "var(--bg)",
                color: "var(--text)",
                border: branchError ? "1px solid var(--danger, #ef4444)" : "1px solid var(--border)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
                fontFamily: "monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {branchError && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: "var(--danger, #ef4444)",
                  fontWeight: 500,
                }}
              >
                {branchError}
              </div>
            )}
          </div>

          {/* Use Worktree */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: "var(--text)",
              }}
            >
              <input type="checkbox" checked={useWorktree} onChange={(e) => setUseWorktree(e.target.checked)} style={{ cursor: "pointer" }} />
              Use Worktree
            </label>
            {useWorktree && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  paddingLeft: 24,
                }}
              >
                → {worktreePath}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
