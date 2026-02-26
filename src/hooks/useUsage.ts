import { useCallback, useState } from "react";
import type { ModelTokens } from "../types/interview";

const STORAGE_KEY = "mimid_usage_cumulative";

export type AllTimeUsage = Record<string, ModelTokens>;

function readStored(): AllTimeUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Migrate old flat format: { inputTokens, outputTokens } → per-model record
    if (typeof parsed === "object" && "inputTokens" in parsed) {
      return { "claude-haiku-4-5": parsed as ModelTokens };
    }
    return parsed as AllTimeUsage;
  } catch {
    return {};
  }
}

export function useUsage() {
  const [allTimeUsage, setAllTimeUsage] = useState<AllTimeUsage>(readStored);

  const addUsage = useCallback(
    (model: string, inputTokens: number, outputTokens: number) => {
      setAllTimeUsage((prev) => {
        const modelPrev = prev[model] ?? { inputTokens: 0, outputTokens: 0 };
        const next: AllTimeUsage = {
          ...prev,
          [model]: {
            inputTokens: modelPrev.inputTokens + inputTokens,
            outputTokens: modelPrev.outputTokens + outputTokens,
          },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const resetAllTime = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAllTimeUsage({});
  }, []);

  return { allTimeUsage, addUsage, resetAllTime };
}
