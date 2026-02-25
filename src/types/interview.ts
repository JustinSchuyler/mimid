export type InterviewType = "systems-design" | "coding" | "behavioral";
export type Role = "interviewee" | "interviewer";
export type Difficulty = "junior" | "mid" | "senior" | "staff";

export interface InterviewConfig {
  type: InterviewType;
  role: Role;
  difficulty: Difficulty;
  topic: string;
  language?: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface SessionUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface InterviewSession {
  id: string;
  createdAt: string;
  config: InterviewConfig;
  systemPrompt: string;
  messages: Message[];
  usage?: SessionUsage;
}
