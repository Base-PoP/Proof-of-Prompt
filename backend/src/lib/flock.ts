import axios from "axios";

const FLOCK_API_KEY = process.env.FLOCK_API_KEY!;
const FLOCK_BASE_URL = "https://api.flock.io/v1";
const USE_MOCK = process.env.USE_MOCK === "true";

// -----------------------------
// Chat Completion (운영 + Mock)
// -----------------------------
export async function callFlockModel(model: string, prompt: string): Promise<string> {
  // ===== MOCK MODE =====
  if (USE_MOCK) {
    const res = await axios.post("http://localhost:4000/mock/chat", {
      model,
      prompt,
    });
    return res.data.choices[0].message.content;
  }

  // ===== REAL FLOCK API =====
  const res = await axios.post(
    `${FLOCK_BASE_URL}/chat/completions`,
    {
      model,
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        "x-api-key": FLOCK_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );

  return res.data.choices[0].message.content;
}

// -----------------------------
// Judge (운영 + Mock)
// -----------------------------
export async function judgeFlock(
  prompt: string,
  responseA: string,
  responseB: string
): Promise<"A" | "B" | "TIE"> {

  // ===== MOCK MODE =====
  if (USE_MOCK) {
    const res = await axios.post("http://localhost:4000/mock/judge", {
      prompt,
      A: responseA,
      B: responseB,
    });
    return res.data.choice;
  }

  // ===== REAL FLOCK JUDGE =====
  const judgePrompt = `
User Prompt:
${prompt}

Response A:
${responseA}

Response B:
${responseB}

Choose the better one. Reply ONLY: "A", "B", or "TIE".
  `;

  const result = await callFlockModel("qwen3-30b-a3b-instruct-2507", judgePrompt);
  const cleaned = result.trim().toUpperCase();

  if (cleaned.includes("A")) return "A";
  if (cleaned.includes("B")) return "B";
  return "TIE";
}
