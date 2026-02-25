import { useCallback, useState } from "react";

const STORAGE_KEY = "mimid_usage_cumulative";

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
}

function readStored(): UsageTotals {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { inputTokens: 0, outputTokens: 0 };
  } catch {
    return { inputTokens: 0, outputTokens: 0 };
  }
}

export function useUsage() {
  const [sessionUsage, setSessionUsage] = useState<UsageTotals>({
    inputTokens: 0,
    outputTokens: 0,
  });
  const [allTimeUsage, setAllTimeUsage] = useState<UsageTotals>(readStored);

  const addUsage = useCallback((inputTokens: number, outputTokens: number) => {
    setSessionUsage((prev) => ({
      inputTokens: prev.inputTokens + inputTokens,
      outputTokens: prev.outputTokens + outputTokens,
    }));
    setAllTimeUsage((prev) => {
      const next = {
        inputTokens: prev.inputTokens + inputTokens,
        outputTokens: prev.outputTokens + outputTokens,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetAllTime = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAllTimeUsage({ inputTokens: 0, outputTokens: 0 });
  }, []);

  return { sessionUsage, allTimeUsage, addUsage, resetAllTime };
}
