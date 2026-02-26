import { createFileRoute } from "@tanstack/react-router";
import {
  Alert,
  AppLayout,
  Box,
  Button,
  Container,
  ContentLayout,
  ExpandableSection,
  Flashbar,
  FormField,
  Header,
  Input,
  KeyValuePairs,
  Link,
  Modal,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useState } from "react";
import { useApiKey } from "../hooks/useApiKey";
import { useUsage } from "../hooks/useUsage";
import { SideNav } from "../components/SideNav";
import {
  calculateCost,
  calculateTotalCost,
  formatCost,
  MODEL_DISPLAY_NAMES,
} from "../lib/pricing";

export const Route = createFileRoute("/api-key")({ component: ApiKeyPage });

function ApiKeyPage() {
  const { apiKey, maskedKey, saveKey, deleteKey } = useApiKey();
  const { allTimeUsage, resetAllTime } = useUsage();
  const [navOpen, setNavOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [flashItems, setFlashItems] = useState<
    Array<{
      type: "success";
      content: string;
      dismissible: boolean;
      id: string;
    }>
  >([]);
  const [securityDismissed, setSecurityDismissed] = useState(false);

  const handleSave = () => {
    if (!inputValue.match(/^sk-ant-/)) {
      setInputError(
        "Key must start with sk-ant-. Check that you copied the full key.",
      );
      return;
    }
    setInputError("");
    saveKey(inputValue);
    setInputValue("");
    setFlashItems([
      {
        type: "success",
        content: "API key saved successfully.",
        dismissible: true,
        id: "key-saved",
      },
    ]);
  };

  const handleDelete = () => {
    deleteKey();
    setShowDeleteModal(false);
    setFlashItems([
      {
        type: "success",
        content: "API key removed.",
        dismissible: true,
        id: "key-deleted",
      },
    ]);
  };

  const allTimeEntries = Object.entries(allTimeUsage);
  const hasUsage = allTimeEntries.length > 0;
  const totalCost = calculateTotalCost(allTimeUsage);

  return (
    <>
      <Modal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        header="Remove API key"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleDelete}>
                Remove
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        Are you sure you want to remove your API key? You will need to re-enter
        it to use the mock interview.
      </Modal>

      <AppLayout
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        navigation={<SideNav />}
        notifications={
          flashItems.length > 0 ? (
            <Flashbar
              items={flashItems.map((item) => ({
                ...item,
                onDismiss: () => setFlashItems([]),
              }))}
            />
          ) : undefined
        }
        content={
          <ContentLayout header={<Header variant="h1">API Key</Header>}>
            <SpaceBetween size="l">
              {!securityDismissed && (
                <Alert
                  type="info"
                  dismissible
                  onDismiss={() => setSecurityDismissed(true)}
                  header="Your key stays in your browser"
                >
                  The API key is stored in your browser's localStorage and is
                  never sent to any server other than Anthropic's API directly
                  from your browser. localStorage is unencrypted — do not use
                  this on a shared computer.
                </Alert>
              )}

              <Container>
                <SpaceBetween size="l">
                  {maskedKey && (
                    <SpaceBetween size="s">
                      <Header variant="h2">Current key</Header>
                      <div className="flex items-center gap-3">
                        <Box variant="code">{maskedKey}</Box>
                        <Button
                          variant="normal"
                          iconName="remove"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          Remove key
                        </Button>
                      </div>
                    </SpaceBetween>
                  )}

                  <SpaceBetween size="s">
                    <Header variant="h2">
                      {apiKey ? "Update key" : "Add key"}
                    </Header>
                    <FormField
                      label="Anthropic API key"
                      errorText={inputError || undefined}
                    >
                      <Input
                        type="password"
                        value={inputValue}
                        onChange={({ detail }) => {
                          setInputValue(detail.value);
                          if (inputError) setInputError("");
                        }}
                        placeholder="sk-ant-..."
                      />
                    </FormField>
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={!inputValue}
                    >
                      {apiKey ? "Update key" : "Save key"}
                    </Button>
                  </SpaceBetween>

                  <ExpandableSection headerText="How to get an API key">
                    <SpaceBetween size="s">
                      <Box variant="p">
                        Follow these steps to create an Anthropic API key:
                      </Box>
                      <ol className="m-0 pl-5 space-y-1 list-decimal">
                        <li>
                          Go to{" "}
                          <Link
                            href="https://console.anthropic.com/settings/keys"
                            external
                            externalIconAriaLabel="Opens in a new tab"
                          >
                            console.anthropic.com/settings/keys
                          </Link>
                        </li>
                        <li>Sign in or create an Anthropic account.</li>
                        <li>Click "Create Key" and give it a name.</li>
                        <li>
                          Copy the key immediately — it won't be shown again.
                        </li>
                        <li>
                          Paste it in the field above and click "Save key".
                        </li>
                      </ol>
                    </SpaceBetween>
                  </ExpandableSection>

                  <SpaceBetween size="s">
                    <Header
                      variant="h2"
                      actions={
                        hasUsage ? (
                          <Button variant="link" onClick={resetAllTime}>
                            Reset
                          </Button>
                        ) : undefined
                      }
                    >
                      Cumulative usage
                    </Header>
                    {!hasUsage ? (
                      <Box variant="p" color="text-status-inactive">
                        No usage recorded yet. Start an interview to see costs
                        here.
                      </Box>
                    ) : (
                      <SpaceBetween size="m">
                        {allTimeEntries.map(([model, tokens]) => (
                          <SpaceBetween size="xs" key={model}>
                            <Box variant="h3" color="text-label">
                              {MODEL_DISPLAY_NAMES[model] ?? model}
                            </Box>
                            <KeyValuePairs
                              columns={3}
                              items={[
                                {
                                  label: "Input tokens",
                                  value: tokens.inputTokens.toLocaleString(),
                                },
                                {
                                  label: "Output tokens",
                                  value: tokens.outputTokens.toLocaleString(),
                                },
                                {
                                  label: "Estimated cost",
                                  value: formatCost(
                                    calculateCost(
                                      model,
                                      tokens.inputTokens,
                                      tokens.outputTokens,
                                    ),
                                  ),
                                },
                              ]}
                            />
                          </SpaceBetween>
                        ))}
                        {allTimeEntries.length > 1 && (
                          <Box>
                            <strong>Total: {formatCost(totalCost)}</strong>
                          </Box>
                        )}
                        <Box variant="small" color="text-status-inactive">
                          Costs are estimates —{" "}
                          <Link
                            href="https://platform.claude.com/docs/en/about-claude/pricing#model-pricing"
                            external
                            externalIconAriaLabel="Opens in a new tab"
                          >
                            see current rates
                          </Link>
                          . Input tokens accumulate across turns as the full
                          conversation history is sent with each request.
                        </Box>
                      </SpaceBetween>
                    )}
                  </SpaceBetween>
                </SpaceBetween>
              </Container>
            </SpaceBetween>
          </ContentLayout>
        }
      />
    </>
  );
}
