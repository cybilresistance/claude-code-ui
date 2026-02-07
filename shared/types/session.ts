export interface SessionStatus {
  active: boolean;
  type: "web" | "cli" | "inactive" | "none";
  hasPending?: boolean;
  lastActivity?: string;
  fileSize?: number;
}
