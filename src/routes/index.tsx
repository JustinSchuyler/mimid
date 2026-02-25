import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Alert,
  AppLayout,
  Box,
  Button,
  ContentLayout,
  FormField,
  Header,
  KeyValuePairs,
  Popover,
  PromptInput,
  SpaceBetween,
  Spinner,
} from "@cloudscape-design/components";
import * as awsui from "@cloudscape-design/design-tokens/index.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import Anthropic from "@anthropic-ai/sdk";
import remarkGfm from "remark-gfm";
import { useApiKey } from "../hooks/useApiKey";
import { useUsage } from "../hooks/useUsage";
import { SideNav } from "../components/SideNav";
import { calculateCost, formatCost, formatTokenCount } from "../lib/pricing";

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
  const { apiKey, apiKeyLoaded } = useApiKey();
  const { sessionUsage, addUsage } = useUsage();
  const [navOpen, setNavOpen] = useState(false);
  const [prompt, setPrompt] = useState<string>("");
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const userMessageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user" && userMessageRef.current) {
      userMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [messages]);

  const callClaude = useCallback(
    async (history: Message[]) => {
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
          system: SYSTEM_PROMPT,
        });
        const { input_tokens, output_tokens } = response.usage;
        addUsage(input_tokens, output_tokens);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              response.content[0].type === "text"
                ? response.content[0].text
                : "N/A",
          },
        ]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isAuthError =
          msg.includes("401") ||
          msg.toLowerCase().includes("auth") ||
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("api key");
        if (isAuthError) {
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

  const sendMessage = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: prompt },
    ];
    setMessages(updatedMessages);
    setPrompt("");
    await callClaude(updatedMessages);
  }, [prompt, messages, callClaude, loading]);

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

  const sessionCost = calculateCost(
    sessionUsage.inputTokens,
    sessionUsage.outputTokens,
  );

  const sessionConstraint =
    sessionUsage.inputTokens > 0 ? (
      <Popover
        dismissButton={false}
        position="top"
        size="medium"
        triggerType="custom"
        content={
          <KeyValuePairs
            columns={1}
            items={[
              {
                label: "Input tokens",
                value: sessionUsage.inputTokens.toLocaleString(),
              },
              {
                label: "Output tokens",
                value: sessionUsage.outputTokens.toLocaleString(),
              },
              {
                label: "Session cost",
                value: formatCost(sessionCost),
              },
            ]}
          />
        }
      >
        <span className="italic text-gray-500 underline decoration-dotted decoration-gray-500 cursor-pointer">
          {formatTokenCount(
            sessionUsage.inputTokens + sessionUsage.outputTokens,
          )}{" "}
          tokens · {formatCost(sessionCost)}
        </span>
      </Popover>
    ) : undefined;

  return (
    <AppLayout
      navigationOpen={navOpen}
      onNavigationChange={({ detail }) => setNavOpen(detail.open)}
      navigation={<SideNav />}
      content={
        <ContentLayout header={<Header variant="h1">Mock Interview</Header>}>
          <SpaceBetween size="m">
            {apiKeyLoaded && !apiKey && (
              <Alert type="warning">
                No API key configured.{" "}
                <Link to="/api-key">Go to API Key settings</Link> to add your
                Anthropic key.
              </Alert>
            )}

            {apiError === "auth" && (
              <Alert type="error">
                Your API key is invalid or has been revoked.{" "}
                <Link to="/api-key">Update your key</Link>.
              </Alert>
            )}

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
                  <Button
                    variant="primary"
                    onClick={startInterview}
                    disabled={!apiKey}
                  >
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
                      {messages.map((message, index) => {
                        const isLastUserMessage =
                          message.role === "user" &&
                          index ===
                            messages.findLastIndex((m) => m.role === "user");

                        return (
                          <motion.div
                            key={index}
                            ref={isLastUserMessage ? userMessageRef : null}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className={`flex ${
                              message.role === "user"
                                ? "justify-end scroll-mt-6"
                                : "justify-start"
                            }`}
                          >
                            <motion.div
                              layout
                              className={`prose rounded-2xl max-w-none p-3 ${message.role === "user" ? "shadow-lg" : ""}`}
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
                        );
                      })}

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
                    {loading && <div className="h-screen" />}
                  </div>

                  <div
                    className="fixed bottom-0 left-0 right-0 z-50 pb-4"
                    style={{
                      backgroundColor: awsui.colorBackgroundContainerContent,
                    }}
                  >
                    <div className="max-w-[800px] mx-auto">
                      <FormField constraintText={sessionConstraint} stretch>
                        <PromptInput
                          onChange={({ detail }) => setPrompt(detail.value)}
                          value={prompt}
                          onAction={sendMessage}
                          actionButtonAriaLabel="Send message"
                          actionButtonIconName="send"
                          minRows={3}
                          placeholder={
                            loading
                              ? "Waiting for response…"
                              : "Type your reply"
                          }
                          disabled={loading}
                          autoFocus
                        />
                      </FormField>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </SpaceBetween>
        </ContentLayout>
      }
    />
  );
}
