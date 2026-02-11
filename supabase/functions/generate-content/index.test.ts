import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("generate-content: returns 200 with valid prompt", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      type: "text",
      prompt: "Say hello in one word",
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 200);
  assertExists(body.content);
});

Deno.test("generate-content: handles empty prompt gracefully", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      type: "text",
      prompt: "",
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 200);
  assertExists(body.content); // Should return fallback content
});

Deno.test("generate-content: handles missing body fields", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  const body = await response.json();
  // Should return fallback or error, not crash
  assertEquals(response.status, 200);
  assertExists(body.content);
});

Deno.test("generate-content: CORS preflight returns 200", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-content`, {
    method: "OPTIONS",
    headers: {
      "Origin": "https://example.com",
      "Access-Control-Request-Method": "POST",
    },
  });

  await response.text(); // consume body
  assertEquals(response.status, 200);
});
