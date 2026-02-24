// @vitest-environment node
import { test, expect } from "vitest";

test("responds with the user", async () => {
  const response = await fetch("https://api.example.com/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Prompt",
    }),
  });

  await expect(response.json()).resolves.toEqual({
    id: "1",
    content: "Hello world",
  });
});
