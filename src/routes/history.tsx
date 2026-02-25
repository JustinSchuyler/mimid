import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import {
  AppLayout,
  Box,
  Button,
  ContentLayout,
  Header,
  Select,
  SpaceBetween,
  Table,
  TextFilter,
} from "@cloudscape-design/components";
import { useEffect, useMemo, useState } from "react";
import { SideNav } from "../components/SideNav";
import { deleteSession, listSessions } from "../lib/sessions";
import type { InterviewSession } from "../types/interview";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "systems-design", label: "Systems Design" },
  { value: "coding", label: "Coding" },
  { value: "behavioral", label: "Behavioral" },
];

const TYPE_LABELS: Record<string, string> = {
  "systems-design": "Systems Design",
  coding: "Coding",
  behavioral: "Behavioral",
};

function capitalize(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

function HistoryPage() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [typeFilter, setTypeFilter] = useState(TYPE_OPTIONS[0]);
  const [textFilter, setTextFilter] = useState("");

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  const filteredSessions = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            typeFilter.value === "all" || s.config.type === typeFilter.value,
        )
        .filter((s) => {
          if (!textFilter) return true;
          const q = textFilter.toLowerCase();
          return (
            s.config.topic.toLowerCase().includes(q) ||
            s.config.type.toLowerCase().includes(q) ||
            s.config.difficulty.toLowerCase().includes(q)
          );
        }),
    [sessions, typeFilter, textFilter],
  );

  const handleDelete = (id: string) => {
    deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <AppLayout
      navigationOpen={navOpen}
      onNavigationChange={({ detail }) => setNavOpen(detail.open)}
      navigation={<SideNav />}
      content={
        <ContentLayout header={<Header variant="h1">Interview History</Header>}>
          <Table
            columnDefinitions={[
              {
                id: "started",
                header: "Started",
                cell: (s) => new Date(s.createdAt).toLocaleString(),
              },
              {
                id: "type",
                header: "Type",
                cell: (s) => TYPE_LABELS[s.config.type] ?? s.config.type,
              },
              {
                id: "difficulty",
                header: "Difficulty",
                cell: (s) => capitalize(s.config.difficulty),
              },
              {
                id: "role",
                header: "Role",
                cell: (s) => capitalize(s.config.role),
              },
              {
                id: "topic",
                header: "Topic",
                cell: (s) => s.config.topic || "—",
              },
              {
                id: "actions",
                header: "Actions",
                cell: (s) => (
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button
                      onClick={() =>
                        navigate({
                          to: "/interview/$id",
                          params: { id: s.id },
                        })
                      }
                    >
                      Resume
                    </Button>
                    <Button onClick={() => handleDelete(s.id)}>Delete</Button>
                  </SpaceBetween>
                ),
              },
            ]}
            items={filteredSessions}
            filter={
              <div className="flex gap-2">
                <div className="w-120">
                  <TextFilter
                    filteringText={textFilter}
                    onChange={({ detail }) =>
                      setTextFilter(detail.filteringText)
                    }
                    filteringPlaceholder="Search by topic, type, or difficulty"
                  />
                </div>
                <Select
                  selectedOption={typeFilter}
                  onChange={({ detail }) =>
                    setTypeFilter(
                      detail.selectedOption as {
                        value: string;
                        label: string;
                      },
                    )
                  }
                  options={TYPE_OPTIONS}
                />
              </div>
            }
            empty={
              <Box textAlign="center" color="inherit">
                <b>No interviews yet.</b>
                <Box padding={{ bottom: "s" }} variant="p" color="inherit">
                  <Link to="/">Start your first interview</Link>
                </Box>
              </Box>
            }
          />
        </ContentLayout>
      }
    />
  );
}
