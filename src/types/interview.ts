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

export interface Message {
  role: "user" | "assistant";
  content: string;
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
