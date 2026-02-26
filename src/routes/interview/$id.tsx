import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Alert,
  AppLayout,
  Box,
  ContentLayout,
  Header,
  KeyValuePairs,
  Popover,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import { useApiKey } from "../../hooks/useApiKey";
import { useInterview } from "../../hooks/useInterview";
import { getSession } from "../../lib/sessions";
import {
  calculateTotalCost,
  formatCost,
  formatTokenCount,
  MODEL_DISPLAY_NAMES,
} from "../../lib/pricing";
import { InterviewChat } from "../../components/InterviewChat";
import { SideNav } from "../../components/SideNav";
import type { InterviewConfig } from "../../types/interview";

export const Route = createFileRoute("/interview/$id")({
  component: InterviewPage,
});

function capitalize(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

const TYPE_LABELS: Record<string, string> = {
  "systems-design": "Systems Design",
  coding: "Coding",
  behavioral: "Behavioral",
};

function InterviewPage() {
  const { id } = Route.useParams();
  const { apiKey, apiKeyLoaded } = useApiKey();
  const {
    messages,
    loading,
    apiError,
    sessionUsage,
    saveError,
    sendMessage,
    initInterview,
  } = useInterview(id);

  const [navOpen, setNavOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<InterviewConfig | null>(
    null,
  );
  const [saveErrorDismissed, setSaveErrorDismissed] = useState(false);

  // Check session existence client-side
  useEffect(() => {
    const session = getSession(id);
    setSessionConfig(session?.config ?? null);
    setSessionChecked(true);
  }, [id]);

  // Kick off new sessions once API key is loaded
  useEffect(() => {
    if (apiKeyLoaded) initInterview();
  }, [apiKeyLoaded, initInterview]);

  const usageEntries = Object.entries(sessionUsage);
  const totalTokens = usageEntries.reduce(
    (sum, [, m]) => sum + m.inputTokens + m.outputTokens,
    0,
  );
  const sessionCost = calculateTotalCost(sessionUsage);

  const constraintText =
    totalTokens > 0 ? (
      <Popover
        dismissButton={false}
        position="top"
        size="medium"
        triggerType="custom"
        content={
          <KeyValuePairs
            columns={1}
            items={[
              ...usageEntries.flatMap(([model, tokens]) => [
                {
                  label: `${MODEL_DISPLAY_NAMES[model] ?? model} · Input`,
                  value: tokens.inputTokens.toLocaleString() + " tokens",
                },
                {
                  label: `${MODEL_DISPLAY_NAMES[model] ?? model} · Output`,
                  value: tokens.outputTokens.toLocaleString() + " tokens",
                },
              ]),
              { label: "Session cost", value: formatCost(sessionCost) },
            ]}
          />
        }
      >
        <span className="italic text-gray-400 underline decoration-dotted decoration-gray-400 cursor-pointer text-[12px]">
          {formatTokenCount(totalTokens)} tokens · {formatCost(sessionCost)}
        </span>
      </Popover>
    ) : undefined;

  const pageTitle = sessionConfig
    ? `${TYPE_LABELS[sessionConfig.type]} — ${capitalize(sessionConfig.difficulty)} — ${capitalize(sessionConfig.role)}`
    : "Interview";

  const content = !sessionChecked ? null : !sessionConfig ? (
    <ContentLayout header={<Header variant="h1">Session not found</Header>}>
      <Box>
        This session does not exist. <Link to="/">Start a new interview</Link>
      </Box>
    </ContentLayout>
  ) : (
    <ContentLayout header={<Header variant="h1">{pageTitle}</Header>}>
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
        {saveError && !saveErrorDismissed && (
          <Alert
            type="warning"
            dismissible
            onDismiss={() => setSaveErrorDismissed(true)}
          >
            Your browser's storage is full — this session's messages could not
            be saved and will be lost on refresh. Consider ending older sessions
            to free up space.
          </Alert>
        )}
        <InterviewChat
          messages={messages}
          loading={loading}
          onSend={sendMessage}
          constraintText={constraintText}
        />
      </SpaceBetween>
    </ContentLayout>
  );

  return (
    <AppLayout
      navigationOpen={navOpen}
      onNavigationChange={({ detail }) => setNavOpen(detail.open)}
      navigation={<SideNav />}
      content={content}
    />
  );
}
