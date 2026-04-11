#!/usr/bin/env node
/**
 * Quick test: OpenRouter chat from CLI.
 * Run: node scripts/test-chat.mjs
 */
import { handleChat } from "../server/chat.mjs";

const body = JSON.stringify({
  messages: [{ role: "user", content: "Say hello in one word." }],
  max_tokens: 50,
});

const out = await handleChat(body);
const data = JSON.parse(out.body);
console.log("Status:", out.statusCode);
if (data.error) console.log("Error:", data.error);
else console.log("Reply:", data.content);
process.exit(out.statusCode === 200 && data.content ? 0 : 1);
