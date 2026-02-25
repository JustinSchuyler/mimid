// Claude Haiku 4.5 — USD per million tokens
// Update here if the model changes: https://www.anthropic.com/pricing
export const INPUT_COST_PER_MTOKEN = 0.8;
export const OUTPUT_COST_PER_MTOKEN = 4.0;
export const CONTEXT_WINDOW = 200_000;

export function calculateCost(
  inputTokens: number,
  outputTokens: number
): number {
  return (
    (inputTokens * INPUT_COST_PER_MTOKEN +
      outputTokens * OUTPUT_COST_PER_MTOKEN) /
    1_000_000
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
