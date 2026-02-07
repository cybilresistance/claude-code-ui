export interface ParsedMessage {
  role: "user" | "assistant";
  type: "text" | "thinking" | "tool_use" | "tool_result";
  content: string;
  toolName?: string;
  toolUseId?: string;
  isBuiltInCommand?: boolean;
  timestamp?: string;
  teamName?: string;
}
