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
import { calculateCost, formatCost, formatTokenCount } from "../../lib/pricing";
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
  const { messages, loading, apiError, sessionUsage, sendMessage, initInterview } =
    useInterview(id);

  const [navOpen, setNavOpen] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<InterviewConfig | null>(null);

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

  const sessionCost = calculateCost(
    sessionUsage.inputTokens,
    sessionUsage.outputTokens,
  );

  const constraintText =
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
          {formatTokenCount(sessionUsage.inputTokens + sessionUsage.outputTokens)}{" "}
          tokens · {formatCost(sessionCost)}
        </span>
      </Popover>
    ) : undefined;

  const pageTitle =
    sessionConfig
      ? `${TYPE_LABELS[sessionConfig.type]} — ${capitalize(sessionConfig.difficulty)} — ${capitalize(sessionConfig.role)}`
      : "Interview";

  const content = !sessionChecked ? null : !sessionConfig ? (
    <ContentLayout header={<Header variant="h1">Session not found</Header>}>
      <Box>
        This session does not exist.{" "}
        <Link to="/">Start a new interview</Link>
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
