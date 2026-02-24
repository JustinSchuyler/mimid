import { createFileRoute } from "@tanstack/react-router";
import {
  AppLayout,
  Box,
  Button,
  ContentLayout,
  Header,
  PromptInput,
  SpaceBetween,
  Spinner,
} from "@cloudscape-design/components";
import * as awsui from "@cloudscape-design/design-tokens/index.js";
import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import Anthropic from "@anthropic-ai/sdk";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/")({ component: App });

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are an experienced technical interviewer conducting a systems design interview.

- Present ONE realistic systems design question.
- Respond to the user's clarifying questions.
- Ask follow-up questions to probe at the depth of the user's knowledge.
- Do not try to trick the user. Gather data honestly to properly assess their strengths and gaps.
- Once satisfied, provide the user with an evaluation of their performance.
- Follow-up with a stellar answer to your systems design question, so the user can better understand the problem.
- End with a list of action items that the user could review to resolve their gaps.
`;

function App() {
  const [navOpen, setNavOpen] = useState(false);
  const [prompt, setPrompt] = useState<string>("");
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const startedRef = useRef(false);

  const callClaude = useCallback(async (history: Message[]) => {
    const anthropic = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true,
    });
    setLoading(true);
    try {
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        messages: history,
        system: SYSTEM_PROMPT,
      });
      console.log(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            message.content[0].type === "text"
              ? message.content[0].text
              : "N/A",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: prompt },
    ];
    setMessages(updatedMessages);
    setPrompt("");
    await callClaude(updatedMessages);
  }, [prompt, messages, callClaude]);

  const startInterview = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
    await callClaude([
      {
        role: "user",
        content: "Please give me a systems design interview question.",
      },
    ]);
  }, [callClaude]);

  return (
    <AppLayout
      navigationOpen={navOpen}
      onNavigationChange={({ detail }) => setNavOpen(detail.open)}
      content={
        <ContentLayout header={<Header variant="h1">Mock Interview</Header>}>
          <AnimatePresence mode="wait">
            {!started ? (
              <motion.div
                key="start"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center max-w-[600px] mx-auto"
              >
                <Box variant="h2">Ready to practice?</Box>
                <Box variant="p" color="text-body-secondary">
                  You'll be given a systems design question and interviewed by
                  an AI. Answer as you would in a real interview — the AI will
                  probe your thinking, give you honest feedback, and then walk
                  you through a model answer.
                </Box>
                <Button variant="primary" onClick={startInterview}>
                  Start Interview
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="pb-[220px] max-w-[800px] mx-auto">
                  <SpaceBetween size="xxl">
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <motion.div
                          layout
                          className={`rounded-2xl max-w-none p-3 prose${message.role === "user" ? " shadow-lg" : ""}`}
                          style={{
                            backgroundColor:
                              message.role === "user"
                                ? awsui.colorBackgroundItemSelected
                                : awsui.colorBackgroundContainerContent,
                            ...(message.role === "user" && {
                              border: `1px solid ${awsui.colorBorderDividerDefault}`,
                            }),
                          }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </motion.div>
                      </motion.div>
                    ))}

                    {loading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div
                          className="rounded-2xl shadow-lg p-3"
                          style={{
                            backgroundColor:
                              awsui.colorBackgroundContainerContent,
                            border: `1px solid ${awsui.colorBorderDividerDefault}`,
                          }}
                        >
                          <Spinner />
                        </div>
                      </motion.div>
                    )}
                  </SpaceBetween>
                </div>

                <div
                  className="fixed bottom-0 left-0 right-0 z-50 pb-4"
                  style={{
                    backgroundColor: awsui.colorBackgroundContainerContent,
                  }}
                >
                  <div className="max-w-[800px] mx-auto">
                    <PromptInput
                      onChange={({ detail }) => setPrompt(detail.value)}
                      value={prompt}
                      onAction={sendMessage}
                      actionButtonAriaLabel="Send message"
                      actionButtonIconName="send"
                      minRows={3}
                      placeholder={
                        loading ? "Waiting for response…" : "Type your reply"
                      }
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ContentLayout>
      }
    />
  );
}
