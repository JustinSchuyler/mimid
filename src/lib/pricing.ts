// Pricing per million tokens (USD).
// https://platform.claude.com/docs/en/about-claude/pricing#model-pricing
export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    "claude-haiku-4-5": { input: 1.0, output: 5.0 },
    "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  };

export const MODEL_OPTIONS = [
  {
    value: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    description: "Fast & affordable",
  },
  {
    value: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    description: "Smarter & slower",
  },
];

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "claude-haiku-4-5": "Haiku 4.5",
  "claude-sonnet-4-6": "Sonnet 4.6",
};

export const CONTEXT_WINDOW = 200_000;

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["claude-haiku-4-5"];
  return (
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  );
}

export function calculateTotalCost(
  byModel: Record<string, { inputTokens: number; outputTokens: number }>,
): number {
  return Object.entries(byModel).reduce(
    (sum, [model, tokens]) =>
      sum + calculateCost(model, tokens.inputTokens, tokens.outputTokens),
    0,
  );
}

export function formatCost(dollars: number): string {
  if (dollars === 0) return "$0.00";
  if (dollars < 0.0001) return "<$0.0001";
  if (dollars < 0.01) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}
