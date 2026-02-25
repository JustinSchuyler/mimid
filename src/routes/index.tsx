import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import {
  Alert,
  AppLayout,
  ContentLayout,
  Header,
} from "@cloudscape-design/components";
import { useState } from "react";
import { motion } from "motion/react";
import { Network, Code2, Users } from "lucide-react";
import { useApiKey } from "../hooks/useApiKey";
import { SideNav } from "../components/SideNav";
import { ConfigModal } from "../components/ConfigModal";
import { saveSession } from "../lib/sessions";
import { buildSystemPrompt } from "../lib/prompts";
import type { InterviewConfig, InterviewType } from "../types/interview";

export const Route = createFileRoute("/")({ component: App });

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

function App() {
  const navigate = useNavigate();
  const { apiKey, apiKeyLoaded } = useApiKey();
  const [navOpen, setNavOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<InterviewType | null>(null);

  const handleStart = (config: InterviewConfig) => {
    const id = crypto.randomUUID();
    saveSession({
      id,
      createdAt: new Date().toISOString(),
      config,
      systemPrompt: buildSystemPrompt(config),
      messages: [],
    });
    navigate({ to: "/interview/$id", params: { id } });
  };

  return (
    <AppLayout
      navigationOpen={navOpen}
      onNavigationChange={({ detail }) => setNavOpen(detail.open)}
      navigation={<SideNav />}
      content={
        <ContentLayout header={<Header variant="h1">Mock Interview</Header>}>
          {apiKeyLoaded && !apiKey && (
            <Alert type="warning">
              No API key configured.{" "}
              <Link to="/api-key">Go to API Key settings</Link> to add your
              Anthropic key.
            </Alert>
          )}

          <ConfigModal
            selectedType={selectedType}
            onDismiss={() => setSelectedType(null)}
            onStart={handleStart}
            apiKeyAvailable={!!apiKey}
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center min-h-[70vh]"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
              {CARDS.map(({ type, title, blurb, Icon, gradient, buttonColor }) => (
                <div
                  key={type}
                  className={`relative rounded-2xl overflow-hidden flex flex-col min-h-[272px] p-6 bg-gradient-to-br ${gradient} text-white transition-shadow duration-200 hover:shadow-2xl`}
                >
                  <div
                    className="absolute inset-0 opacity-[0.15] pointer-events-none"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle, white 1px, transparent 1px)",
                      backgroundSize: "22px 22px",
                    }}
                  />
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
                        onClick={() => setSelectedType(type)}
                        disabled={apiKeyLoaded && !apiKey}
                        className={`bg-white ${buttonColor} font-semibold text-sm px-5 py-2 rounded-lg hover:bg-white/90 active:bg-white/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        Start →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </ContentLayout>
      }
    />
  );
}
