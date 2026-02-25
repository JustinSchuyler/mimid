import {
  Box,
  Button,
  Form,
  FormField,
  Input,
  Modal,
  RadioGroup,
  Select,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import type { Difficulty, InterviewConfig, InterviewType, Role } from "../types/interview";

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

const CARD_TITLES: Record<InterviewType, string> = {
  "systems-design": "Systems Design",
  coding: "Coding",
  behavioral: "Behavioral",
};

const TOPIC_PLACEHOLDERS: Record<InterviewType, string> = {
  coding: "e.g. Dynamic programming, Graph traversal",
  behavioral: "e.g. Ownership, Conflict resolution",
  "systems-design": "e.g. Design a rate limiter",
};

interface Props {
  selectedType: InterviewType | null;
  onDismiss: () => void;
  onStart: (config: InterviewConfig) => void;
  apiKeyAvailable: boolean;
}

export function ConfigModal({ selectedType, onDismiss, onStart, apiKeyAvailable }: Props) {
  const [modalRole, setModalRole] = useState<Role>("interviewee");
  const [modalDifficulty, setModalDifficulty] = useState<Difficulty>("mid");
  const [modalTopic, setModalTopic] = useState("");
  const [modalLanguage, setModalLanguage] = useState<{ value: string; label: string }>(
    LANGUAGE_OPTIONS[0],
  );

  // Reset form when a new type is selected
  useEffect(() => {
    if (selectedType !== null) {
      setModalRole("interviewee");
      setModalDifficulty("mid");
      setModalTopic("");
      setModalLanguage(LANGUAGE_OPTIONS[0]);
    }
  }, [selectedType]);

  const handleStart = () => {
    if (!selectedType) return;
    const config: InterviewConfig = {
      type: selectedType,
      role: modalRole,
      difficulty: modalDifficulty,
      topic: modalTopic,
      language: selectedType === "coding" ? modalLanguage.value : undefined,
    };
    onStart(config);
  };

  return (
    <Modal
      visible={!!selectedType}
      onDismiss={onDismiss}
      header={
        selectedType ? `${CARD_TITLES[selectedType]} Interview` : "Configure Interview"
      }
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStart} disabled={!apiKeyAvailable}>
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
              onChange={({ detail }) => setModalRole(detail.value as Role)}
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

          <FormField label="Topic" description="Leave blank to let Claude choose.">
            <Input
              value={modalTopic}
              onChange={({ detail }) => setModalTopic(detail.value)}
              placeholder={selectedType ? TOPIC_PLACEHOLDERS[selectedType] : ""}
            />
          </FormField>

          {selectedType === "coding" && (
            <FormField label="Language preference">
              <Select
                selectedOption={modalLanguage}
                onChange={({ detail }) =>
                  setModalLanguage(
                    detail.selectedOption as { value: string; label: string },
                  )
                }
                options={LANGUAGE_OPTIONS}
              />
            </FormField>
          )}
        </SpaceBetween>
      </Form>
    </Modal>
  );
}
