import { useState } from "react";

const STORAGE_KEY = "mimid_anthropic_api_key";

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });

  const saveKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
  };

  const deleteKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
  };

  const maskedKey = apiKey
    ? `sk-ant-...${apiKey.slice(-4)}`
    : null;

  return { apiKey, maskedKey, saveKey, deleteKey };
}
