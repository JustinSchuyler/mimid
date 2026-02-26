import { useCallback, useEffect, useRef, useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { useApiKey } from "./useApiKey";
import { useUsage } from "./useUsage";
import { getSession, saveSession } from "../lib/sessions";
import { buildFirstMessage } from "../lib/prompts";
import type { InterviewSession, Message, ModelTokens, SessionUsage, UserContentBlock } from "../types/interview";

const DEFAULT_MODEL = "claude-haiku-4-5";

/** Migrate old flat { inputTokens, outputTokens } usage to per-model record. */
function migrateUsage(raw: unknown): SessionUsage {
  if (!raw || typeof raw !== "object") return {};
  if ("inputTokens" in raw) {
    return { [DEFAULT_MODEL]: raw as ModelTokens };
  }
  return raw as SessionUsage;
}

export function useInterview(sessionId: string) {
  const { apiKey } = useApiKey();
  const { addUsage } = useUsage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sessionUsage, setSessionUsage] = useState<SessionUsage>({});
  const [saveError, setSaveError] = useState(false);

  const sessionRef = useRef<InterviewSession | null>(null);
  // Mutable accumulator — avoids stale closure in callClaude
  const usageRef = useRef<SessionUsage>({});
  const initCalledRef = useRef(false);

  // Load session from localStorage client-side
  useEffect(() => {
    const session = getSession(sessionId);
    sessionRef.current = session;
    if (session && session.messages.length > 0) {
      setMessages(session.messages);
    }
    const stored = migrateUsage(session?.usage);
    usageRef.current = stored;
    setSessionUsage(stored);
  }, [sessionId]);

  const callClaude = useCallback(
    async (history: Message[]) => {
      const session = sessionRef.current;
      if (!session) return;

      const model = session.config.model ?? DEFAULT_MODEL;
      const anthropic = new Anthropic({
        apiKey: apiKey ?? "",
        dangerouslyAllowBrowser: true,
      });
      setLoading(true);
      setApiError(null);
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 4096,
          messages: history as MessageParam[],
          system: session.systemPrompt,
        });
        const { input_tokens, output_tokens } = response.usage;
        addUsage(model, input_tokens, output_tokens);

        // Accumulate via ref so callClaude never reads stale state
        const prev = usageRef.current[model] ?? { inputTokens: 0, outputTokens: 0 };
        const newUsage: SessionUsage = {
          ...usageRef.current,
          [model]: {
            inputTokens: prev.inputTokens + input_tokens,
            outputTokens: prev.outputTokens + output_tokens,
          },
        };
        usageRef.current = newUsage;
        setSessionUsage(newUsage);

        const assistantMessage: Message = {
          role: "assistant",
          content:
            response.content[0].type === "text"
              ? response.content[0].text
              : "N/A",
        };
        setMessages((prevMsgs) => {
          const updated = [...prevMsgs, assistantMessage];
          if (!saveSession({ ...session, messages: updated, usage: newUsage })) {
            setSaveError(true);
          }
          return updated;
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAuth =
          msg.includes("401") ||
          msg.toLowerCase().includes("auth") ||
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("api key");
        if (isAuth) {
          setApiError("auth");
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `**Error:** ${msg}` },
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    [apiKey, addUsage],
  );

  const sendMessage = useCallback(
    async (blocks: UserContentBlock[]) => {
      if (blocks.length === 0 || loading) return;
      const session = sessionRef.current;
      if (!session) return;
      const userMessage: Message = { role: "user", content: blocks };
      const updated = [...messages, userMessage];
      setMessages(updated);
      if (!saveSession({ ...session, messages: updated, usage: usageRef.current })) {
        setSaveError(true);
      }
      await callClaude(updated);
    },
    [loading, messages, callClaude],
  );

  // initInterview: guarded by ref to prevent Strict Mode double-fire
  const initInterview = useCallback(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    const session = sessionRef.current;
    if (!session || session.messages.length > 0) return;
    // Trigger message sent to API but never stored in state or localStorage
    callClaude([{ role: "user", content: buildFirstMessage(session.config) }]);
  }, [callClaude]);

  return { messages, loading, apiError, sessionUsage, saveError, sendMessage, initInterview };
}
