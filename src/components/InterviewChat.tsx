import {
  FormField,
  PromptInput,
  SpaceBetween,
  Spinner,
} from "@cloudscape-design/components";
import * as awsui from "@cloudscape-design/design-tokens/index.js";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types/interview";

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (text: string) => void;
  constraintText?: React.ReactNode;
}

export function InterviewChat({ messages, loading, onSend, constraintText }: Props) {
  const [prompt, setPrompt] = useState("");
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

  const handleSend = () => {
    if (!prompt.trim() || loading) return;
    onSend(prompt);
    setPrompt("");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="pb-[220px] max-w-[800px] mx-auto">
          <SpaceBetween size="xxl">
            {messages.map((message, index) => {
              const isLastUserMessage =
                message.role === "user" &&
                index === messages.findLastIndex((m) => m.role === "user");

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
                    backgroundColor: awsui.colorBackgroundContainerContent,
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
          style={{ backgroundColor: awsui.colorBackgroundContainerContent }}
        >
          <div className="max-w-[800px] mx-auto">
            <FormField constraintText={constraintText} stretch>
              <PromptInput
                onChange={({ detail }) => setPrompt(detail.value)}
                value={prompt}
                onAction={handleSend}
                actionButtonAriaLabel="Send message"
                actionButtonIconName="send"
                minRows={3}
                placeholder={loading ? "Waiting for response…" : "Type your reply"}
                disabled={loading}
                autoFocus
              />
            </FormField>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
