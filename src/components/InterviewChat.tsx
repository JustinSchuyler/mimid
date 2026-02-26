import { SpaceBetween, Spinner } from "@cloudscape-design/components";
import * as awsui from "@cloudscape-design/design-tokens/index.js";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// @ts-ignore - style path not covered by @types/react-syntax-highlighter
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";
import type { Message, UserContentBlock } from "../types/interview";
import { RichEditor } from "./RichEditor";

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (blocks: UserContentBlock[]) => void;
  constraintText?: React.ReactNode;
}

function SyntaxHighlightedCode({
  className,
  children,
}: React.HTMLAttributes<HTMLElement>) {
  const match = /language-(\w+)/.exec(className || "");
  if (match) {
    return (
      <SyntaxHighlighter language={match[1]} style={oneLight} PreTag="div">
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
  }
  return <code className={className}>{children}</code>;
}

const mdComponents = { code: SyntaxHighlightedCode };

function renderContent(content: string | UserContentBlock[]) {
  if (typeof content === "string") {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    );
  }
  return (
    <>
      {content.map((block, i) => {
        if (block.type === "text") {
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm]}
              components={mdComponents}
            >
              {block.text}
            </ReactMarkdown>
          );
        }
        if (block.type === "image" && block.source.type === "base64") {
          return (
            <img
              key={i}
              src={`data:${block.source.media_type};base64,${block.source.data}`}
              className="max-w-full rounded"
              alt="Sketch"
            />
          );
        }
        return null;
      })}
    </>
  );
}

export function InterviewChat({
  messages,
  loading,
  onSend,
  constraintText,
}: Props) {
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="pb-[280px] max-w-[800px] mx-auto">
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
                    {renderContent(message.content)}
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
          <div className="max-w-[810px] mx-auto">
            <RichEditor
              onSubmit={onSend}
              disabled={loading}
              placeholder={
                loading ? "Waiting for response…" : "Type your reply"
              }
              constraintText={constraintText}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
