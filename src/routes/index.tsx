import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Alert,
  AppLayout,
  Box,
  Button,
  ContentLayout,
  Form,
  FormField,
  Header,
  Input,
  KeyValuePairs,
  Modal,
  Popover,
  PromptInput,
  RadioGroup,
  Select,
  SpaceBetween,
  Spinner,
} from "@cloudscape-design/components";
import * as awsui from "@cloudscape-design/design-tokens/index.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import Anthropic from "@anthropic-ai/sdk";
import remarkGfm from "remark-gfm";
import { Network, Code2, Users } from "lucide-react";
import { useApiKey } from "../hooks/useApiKey";
import { useUsage } from "../hooks/useUsage";
import { SideNav } from "../components/SideNav";
import { calculateCost, formatCost, formatTokenCount } from "../lib/pricing";

export const Route = createFileRoute("/")({ component: App });

// ── Types ──────────────────────────────────────────────────────────────────

type InterviewType = "systems-design" | "coding" | "behavioral";
type Role = "interviewee" | "interviewer";
type Difficulty = "junior" | "mid" | "senior" | "staff";

interface InterviewConfig {
  type: InterviewType;
  role: Role;
  difficulty: Difficulty;
  topic: string;
  language?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Hero card definitions ──────────────────────────────────────────────────

const CARDS: {
  type: InterviewType;
  title: string;
  blurb: string;
  Icon: React.ComponentType<{ size: number }>;
  gradient: string;
  buttonColor: string;
}[] = [
  {
    type: "systems-design",
    title: "Systems Design",
    blurb:
      "Architect scalable systems and demonstrate your command of distributed design principles.",
    Icon: Network,
    gradient: "from-blue-600 to-indigo-700",
    buttonColor: "text-blue-700",
  },
  {
    type: "coding",
    title: "Coding",
    blurb:
      "Solve algorithmic problems with clarity, efficiency, and well-structured code.",
    Icon: Code2,
    gradient: "from-violet-600 to-purple-700",
    buttonColor: "text-violet-700",
  },
  {
    type: "behavioral",
    title: "Behavioral",
    blurb:
      "Articulate your experience and demonstrate leadership through structured storytelling.",
    Icon: Users,
    gradient: "from-teal-500 to-emerald-700",
    buttonColor: "text-teal-700",
  },
];

const LANGUAGE_OPTIONS = [
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "c++", label: "C++" },
  { value: "c#", label: "C#" },
];

// ── Prompt builders ────────────────────────────────────────────────────────

function buildSystemPrompt(config: InterviewConfig): string {
  const level = config.difficulty[0].toUpperCase() + config.difficulty.slice(1);
  const topic = config.topic.trim() || null;

  if (config.type === "systems-design") {
    const topicLine = topic
      ? `Topic: ${topic}`
      : `Topic: Choose a realistic systems design question appropriate for a ${level}-level engineer.`;
    if (config.role === "interviewee") {
      return `You are an experienced technical interviewer at a top tech company conducting a systems design interview.

${topicLine}
Candidate level: ${level}

- Present ONE systems design question to open the interview.
- Engage naturally: respond to clarifying questions, probe for depth with targeted follow-ups.
- Assess honestly — surface both strengths and gaps.
- When the interview feels complete, close with: (1) a concise performance evaluation, (2) a model answer, (3) specific action items to address gaps.`;
    }
    return `You are a software engineering candidate interviewing for a ${level}-level position.

${topic ? `The interview is about: ${topic}` : "Wait for the interviewer to present a systems design question."}

- Briefly introduce yourself, then wait for the question.
- Think out loud, ask clarifying questions, and reason through your design.
- Perform realistically for a ${level}-level engineer — show genuine strengths but also authentic gaps.`;
  }

  if (config.type === "coding") {
    const langLine = config.language
      ? `Preferred language: ${config.language}`
      : "";
    const topicLine = topic
      ? `Problem area: ${topic}`
      : `Problem area: Choose a coding problem appropriate for a ${level}-level engineer.`;
    if (config.role === "interviewee") {
      return `You are an experienced technical interviewer at a top tech company conducting a coding interview.

${topicLine}
${langLine}
Candidate level: ${level}

- Present ONE coding problem to open the interview.
- Let the candidate ask clarifying questions; provide constraints and examples as needed.
- Probe for time/space complexity, edge cases, and code quality.
- Offer high-level hints only if the candidate is genuinely stuck — do not give away solutions.
- When complete, close with: (1) a performance evaluation, (2) an optimal solution with explanation, (3) action items.`;
    }
    return `You are a software engineering candidate interviewing for a ${level}-level position.

${topic ? `The coding problem is about: ${topic}` : "Wait for the interviewer to give you a coding problem."}
${langLine ? `You prefer to code in ${config.language}.` : ""}

- Briefly introduce yourself, then wait for the problem.
- Ask clarifying questions before diving in.
- Think out loud as you work toward a solution.
- Perform realistically for a ${level}-level engineer.`;
  }

  // behavioral
  const topicLine = topic
    ? `Focus area: ${topic}`
    : `Focus area: Choose 2–3 behavioral questions appropriate for a ${level}-level engineer.`;
  if (config.role === "interviewee") {
    return `You are an experienced interviewer conducting a behavioral interview.

${topicLine}
Candidate level: ${level}

- Open with a warm introduction, then ask behavioral questions one at a time.
- Follow up with probing questions to draw out specifics: actions taken, impact, lessons learned.
- Cover 2-3 questions total across the interview.
- When complete, close with: (1) an evaluation of communication and examples, (2) tips for stronger answers, (3) specific action items.`;
  }
  return `You are a software engineering candidate interviewing for a ${level}-level position.

${topic ? `The interview focuses on: ${topic}` : "Wait for the interviewer to ask behavioral questions."}

- Briefly introduce yourself, then wait for questions.
- Answer using the STAR format (Situation, Task, Action, Result).
- Be specific and authentic — reflect appropriate seniority for a ${level}-level candidate.
- Give realistic answers, not perfectly polished ones.`;
}

function buildFirstMessage(config: InterviewConfig): string {
  if (config.role === "interviewee") {
    const label = {
      "systems-design": "systems design",
      coding: "coding",
      behavioral: "behavioral",
    }[config.type];
    return `Please begin the ${label} interview.`;
  }
  return "Hi, I'm ready to start. Please begin the interview whenever you are.";
}

// ── Component ──────────────────────────────────────────────────────────────

function App() {
  const { apiKey, apiKeyLoaded } = useApiKey();
  const { sessionUsage, addUsage } = useUsage();
  const [navOpen, setNavOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Config modal state
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);
  const [modalRole, setModalRole] = useState<Role>("interviewee");
  const [modalDifficulty, setModalDifficulty] = useState<Difficulty>("mid");
  const [modalTopic, setModalTopic] = useState("");
  const [modalLanguage, setModalLanguage] = useState<{
    value: string;
    label: string;
  }>(LANGUAGE_OPTIONS[0]);

  const startedRef = useRef(false);
  const systemPromptRef = useRef("");
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
          system: systemPromptRef.current,
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

  const startInterview = useCallback(
    (config: InterviewConfig) => {
      if (startedRef.current) return;
      startedRef.current = true;
      systemPromptRef.current = buildSystemPrompt(config);
      setStarted(true);
      callClaude([{ role: "user", content: buildFirstMessage(config) }]);
    },
    [callClaude],
  );

  const openModal = (type: InterviewType) => {
    setSelectedType(type);
    setModalRole("interviewee");
    setModalDifficulty("mid");
    setModalTopic("");
    setModalLanguage(LANGUAGE_OPTIONS[0]);
  };

  const handleModalStart = () => {
    if (!selectedType) return;
    const config: InterviewConfig = {
      type: selectedType,
      role: modalRole,
      difficulty: modalDifficulty,
      topic: modalTopic,
      language: selectedType === "coding" ? modalLanguage.value : undefined,
    };
    setSelectedType(null);
    startInterview(config);
  };

  const sendMessage = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    const updated: Message[] = [...messages, { role: "user", content: prompt }];
    setMessages(updated);
    setPrompt("");
    await callClaude(updated);
  }, [prompt, messages, callClaude, loading]);

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
              { label: "Session cost", value: formatCost(sessionCost) },
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

  const selectedCard = CARDS.find((c) => c.type === selectedType);
  const topicPlaceholder =
    selectedType === "coding"
      ? "e.g. Dynamic programming, Graph traversal"
      : selectedType === "behavioral"
        ? "e.g. Ownership, Conflict resolution"
        : "e.g. Design a rate limiter";

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

            {/* ── Config modal ─────────────────────────────────────────── */}
            <Modal
              visible={!!selectedType}
              onDismiss={() => setSelectedType(null)}
              header={
                selectedCard
                  ? `${selectedCard.title} Interview`
                  : "Configure Interview"
              }
              footer={
                <Box float="right">
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      variant="link"
                      onClick={() => setSelectedType(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleModalStart}
                      disabled={!apiKey}
                    >
                      Start interview
                    </Button>
                  </SpaceBetween>
                </Box>
              }
            >
              <Form>
                <SpaceBetween size="l">
                  <FormField label="Your role">
                    <RadioGroup
                      value={modalRole}
                      onChange={({ detail }) =>
                        setModalRole(detail.value as Role)
                      }
                      items={[
                        {
                          value: "interviewee",
                          label: "Interviewee",
                          description:
                            "Practice answering questions — Claude plays the interviewer",
                        },
                        {
                          value: "interviewer",
                          label: "Interviewer",
                          description:
                            "Practice asking questions — Claude plays the candidate",
                        },
                      ]}
                    />
                  </FormField>

                  <FormField label="Difficulty">
                    <RadioGroup
                      value={modalDifficulty}
                      onChange={({ detail }) =>
                        setModalDifficulty(detail.value as Difficulty)
                      }
                      items={[
                        { value: "junior", label: "Junior" },
                        { value: "mid", label: "Mid-level" },
                        { value: "senior", label: "Senior" },
                        { value: "staff", label: "Staff" },
                      ]}
                    />
                  </FormField>

                  <FormField
                    label="Topic"
                    description="Leave blank to let Claude choose."
                  >
                    <Input
                      value={modalTopic}
                      onChange={({ detail }) => setModalTopic(detail.value)}
                      placeholder={topicPlaceholder}
                    />
                  </FormField>

                  {selectedType === "coding" && (
                    <FormField label="Language preference">
                      <Select
                        selectedOption={modalLanguage}
                        onChange={({ detail }) =>
                          setModalLanguage(
                            detail.selectedOption as {
                              value: string;
                              label: string;
                            },
                          )
                        }
                        options={LANGUAGE_OPTIONS}
                      />
                    </FormField>
                  )}
                </SpaceBetween>
              </Form>
            </Modal>

            {/* ── Main view ────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {!started ? (
                <motion.div
                  key="hero"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center min-h-[70vh]"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                    {CARDS.map(
                      ({ type, title, blurb, Icon, gradient, buttonColor }) => (
                        <div
                          key={type}
                          className={`relative rounded-2xl overflow-hidden flex flex-col min-h-[272px] p-6 bg-gradient-to-br ${gradient} text-white transition-shadow duration-200 hover:shadow-2xl`}
                        >
                          {/* Dot texture overlay */}
                          <div
                            className="absolute inset-0 opacity-[0.15] pointer-events-none"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle, white 1px, transparent 1px)",
                              backgroundSize: "22px 22px",
                            }}
                          />
                          {/* Card content */}
                          <div className="relative flex flex-col h-full gap-4">
                            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                              <Icon size={22} />
                            </div>
                            <div className="flex-1">
                              <h2 className="text-[1.15rem] font-bold tracking-tight leading-snug">
                                {title}
                              </h2>
                              <p className="text-sm mt-1.5 opacity-80 leading-relaxed">
                                {blurb}
                              </p>
                            </div>
                            <div>
                              <button
                                onClick={() => openModal(type)}
                                disabled={apiKeyLoaded && !apiKey}
                                className={`bg-white ${buttonColor} font-semibold text-sm px-5 py-2 rounded-lg hover:bg-white/90 active:bg-white/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                Start →
                              </button>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
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
