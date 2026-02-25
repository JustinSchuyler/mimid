import { useCallback, useEffect, useRef, useState } from "react";
import Anthropic from "@anthropic-ai/sdk";
import { useApiKey } from "./useApiKey";
import { useUsage } from "./useUsage";
import { getSession, saveSession } from "../lib/sessions";
import { buildFirstMessage } from "../lib/prompts";
import type { InterviewSession, Message, SessionUsage } from "../types/interview";

const ZERO_USAGE: SessionUsage = { inputTokens: 0, outputTokens: 0 };

export function useInterview(sessionId: string) {
  const { apiKey } = useApiKey();
  const { addUsage } = useUsage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sessionUsage, setSessionUsage] = useState<SessionUsage>(ZERO_USAGE);

  const sessionRef = useRef<InterviewSession | null>(null);
  // Mutable accumulator — avoids stale closure in callClaude
  const usageRef = useRef<SessionUsage>(ZERO_USAGE);
  const initCalledRef = useRef(false);

  // Load session from localStorage client-side
  useEffect(() => {
    const session = getSession(sessionId);
    sessionRef.current = session;
    if (session && session.messages.length > 0) {
      setMessages(session.messages);
    }
    const stored = session?.usage ?? ZERO_USAGE;
    usageRef.current = stored;
    setSessionUsage(stored);
  }, [sessionId]);

  const callClaude = useCallback(
    async (history: Message[]) => {
      const session = sessionRef.current;
      if (!session) return;

      const anthropic = new Anthropic({
        apiKey: apiKey ?? "",
        dangerouslyAllowBrowser: true,
      });
      setLoading(true);
      setApiError(null);
      try {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 4096,
          messages: history,
          system: session.systemPrompt,
        });
        const { input_tokens, output_tokens } = response.usage;
        addUsage(input_tokens, output_tokens);

        // Accumulate usage via ref so we never read stale state
        const newUsage: SessionUsage = {
          inputTokens: usageRef.current.inputTokens + input_tokens,
          outputTokens: usageRef.current.outputTokens + output_tokens,
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
        setMessages((prev) => {
          const updated = [...prev, assistantMessage];
          saveSession({ ...session, messages: updated, usage: newUsage });
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
    async (text: string) => {
      if (!text.trim() || loading) return;
      const session = sessionRef.current;
      if (!session) return;
      const userMessage: Message = { role: "user", content: text };
      const updated = [...messages, userMessage];
      setMessages(updated);
      saveSession({ ...session, messages: updated, usage: usageRef.current });
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

  return { messages, loading, apiError, sessionUsage, sendMessage, initInterview };
}
