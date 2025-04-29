import fetch from "node-fetch";
import FormData from "form-data";

// Polyfill global fetch & FormData before loading the OpenAI SDK
;(globalThis as any).fetch = fetch;
;(globalThis as any).FormData = FormData;

import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
});
