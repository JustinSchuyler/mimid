export type InterviewType = "systems-design" | "coding" | "behavioral";
export type Role = "interviewee" | "interviewer";
export type Difficulty = "junior" | "mid" | "senior" | "staff";

export interface InterviewConfig {
  type: InterviewType;
  role: Role;
  difficulty: Difficulty;
  topic: string;
  language?: string;
  model: string;
}

// Matches Anthropic SDK's TextBlockParam | ImageBlockParam for user messages.
// Code is stored as a text block with markdown fences (```lang\n...\n```).
// Sketches are stored as image blocks (JPEG, base64).
export type UserContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } };

export interface Message {
  role: "user" | "assistant";
  content: string | UserContentBlock[];
}

export interface ModelTokens {
  inputTokens: number;
  outputTokens: number;
}

// Keyed by model ID, e.g. { "claude-haiku-4-5": { inputTokens, outputTokens } }
export type SessionUsage = Record<string, ModelTokens>;

export interface InterviewSession {
  id: string;
  createdAt: string;
  config: InterviewConfig;
  systemPrompt: string;
  messages: Message[];
  usage?: SessionUsage;
}
