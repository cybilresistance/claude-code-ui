export interface ParsedMessage {
  role: "user" | "assistant" | "system";
  type: "text" | "thinking" | "tool_use" | "tool_result" | "system";
  content: string;
  toolName?: string;
  toolUseId?: string;
  isBuiltInCommand?: boolean;
  timestamp?: string;
  teamName?: string;
  /** Present on system messages like compact_boundary */
  subtype?: string;
}
