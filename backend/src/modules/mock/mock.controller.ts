import { Request, Response } from "express";

// ------------------------------
// Mock Chat Completion
// ------------------------------
export const mockChatHandler = async (req: Request, res: Response) => {
  const { model, prompt } = req.body;

  return res.json({
    id: "mock-response",
    object: "chat.completion",
    choices: [
      {
        message: {
          role: "assistant",
          content: `[Mock: ${model}] You asked: "${prompt}".`
        }
      }
    ]
  });
};

// ------------------------------
// Mock Judge
// ------------------------------
export const mockJudgeHandler = async (req: Request, res: Response) => {
  const { prompt, A, B } = req.body;

  const rand = Math.random();
  const choice = rand < 0.33 ? "A" : rand < 0.66 ? "B" : "TIE";

  return res.json({
    id: "mock-judge",
    choice
  });
};
