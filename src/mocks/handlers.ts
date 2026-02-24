import { delay, http, HttpResponse } from "msw";

const response1 = {
  model: "claude-haiku-4-5-20251001",
  id: "msg_0129RZBuCC9YJAFc7oAdUgHc",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",
      text: "# Systems Design Interview Question\n\n**Design a real-time notification system for a large-scale social media platform (like Twitter/X).**\n\nHere's the context:\n- Millions of users worldwide\n- Users should receive notifications in real-time (or near real-time) when:\n  - Someone likes their post\n  - Someone follows them\n  - Someone replies to their post\n  - Someone mentions them\n- Notifications need to be delivered across multiple channels: in-app, push notifications, email\n- Some users are very active (millions of followers), while others have few followers\n- Users should be able to customize notification preferences\n\n---\n\n## Before we dive in:\n\n**Please start by asking me any clarifying questions you'd like to ask about the requirements, constraints, or assumptions.** This is a crucial part of the interview, so take your time and think about what matters for building a good solution.\n\nWhat would you like to know?",
    },
  ],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: {
    input_tokens: 149,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: {
      ephemeral_5m_input_tokens: 0,
      ephemeral_1h_input_tokens: 0,
    },
    output_tokens: 205,
    service_tier: "standard",
    inference_geo: "not_available",
  },
};

const response2 = {
  model: "claude-haiku-4-5-20251001",
  id: "msg_0153SySAggn6XHWevpaCiRe9",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",
      text: "Excellent start! You're asking the *right* questions—exactly what I'd want to see. Let me answer these systematically:\n\n---\n\n## My Answers to Your Questions\n\n**Aggregation:**\n- Yes, aggregation is important. Users shouldn't receive 10,000 individual \"X liked your post\" notifications. Aggregate by type, and allow users to batch them (e.g., \"5 people liked your post\" in a single notification).\n\n**Traffic Patterns:**\n- Highly non-uniform and spiky. Major events (celebrity posts, breaking news) can cause traffic spikes of 100x+ normal load within seconds.\n- Most users are inactive; a small percentage generate most notifications.\n- Time zones matter—peak hours differ by region.\n\n**Read vs. Write Intensity:**\n- **Write-heavy** (as you suspected). Billions of notification events daily. But also significant **read traffic** (users fetching their notification feed).\n\n**Data Storage & Retention:**\n- Yes, persist notifications. Keep hot data (last 30 days) for quick access. Archive older data.\n- Scale: ~billions of notification records at any given time.\n\n**Dependencies:**\n- User service (check if user exists, privacy settings)\n- Post service (validate posts being notified about)\n- User preferences service (notification settings)\n- Analytics/logging systems\n\n**Resilience & SLA:**\n- Notifications can tolerate **5-10 minute delays** during degradation without major issues.\n- **At-least-once delivery** semantics preferred (some duplicates acceptable, but rare).\n- SLA: 99.9% availability for in-app notifications.\n\n**Queuing & Failure Recovery:**\n- Yes, assume failures happen. Queue notifications and retry.\n\n**Incremental Rollout & DR:**\n- Yes, gradual rollout needed. Disaster recovery plan required (multi-region).\n\n**Operational Metrics & Security:**\n- Both important. I'd like to see you think about these, but we can deep-dive if you want.\n\n**Serverless:**\n- Not suitable here. We need persistent connections and low-latency delivery. Self-managed infrastructure better.\n\n---\n\n## Now it's your turn:\n\n**Walk me through your high-level architecture.** Start at 30,000 feet—what are the main components and how do they interact? Don't worry about every detail yet; just give me the big picture.",
    },
  ],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: {
    input_tokens: 635,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: {
      ephemeral_5m_input_tokens: 0,
      ephemeral_1h_input_tokens: 0,
    },
    output_tokens: 548,
    service_tier: "standard",
    inference_geo: "not_available",
  },
};

export const handlers = [
  http.post(
    "https://api.anthropic.com/v1/messages",
    async () => {
      await delay(750);
      return HttpResponse.json(response1);
    },
    { once: true },
  ),
  http.post("https://api.anthropic.com/v1/messages", async () => {
    await delay(750);
    return HttpResponse.json(response2);
  }),
];
