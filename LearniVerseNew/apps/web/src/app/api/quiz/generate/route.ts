import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

type GeneratedQuestion = {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctLetter: "A" | "B" | "C" | "D";
  weighting: number;
};

const SYSTEM_INSTRUCTION = `You are an expert educator who creates high-quality multiple-choice quiz questions.
Given document content, generate clear, well-structured questions suitable for a high school assessment.

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Exactly one option must be correct
- Distractors (wrong answers) should be plausible but clearly wrong to a student who understands the material
- Questions should test understanding, not just memorisation
- Vary difficulty: include some straightforward recall and some application questions
- Return ONLY valid JSON — no markdown fences, no commentary`;

const JSON_SCHEMA = `Each element must have these exact keys:
{
  "prompt": "question text",
  "optionA": "option A text",
  "optionB": "option B text",
  "optionC": "option C text",
  "optionD": "option D text",
  "correctLetter": "A" | "B" | "C" | "D",
  "weighting": 2
}

Return only the JSON array, nothing else.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      text?: string;
      fileBase64?: string;
      mediaType?: string;
      questionCount?: number;
    };

    const count = Math.min(Math.max(Number(body.questionCount ?? 5), 1), 20);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    let raw: string;

    if (body.fileBase64 && body.mediaType) {
      // Gemini inline data — works for PDF, plain text, images
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: body.mediaType,
            data: body.fileBase64,
          },
        },
        `Generate exactly ${count} multiple-choice questions from this document.\n\n${JSON_SCHEMA}`,
      ]);
      raw = result.response.text();
    } else {
      const text = body.text ?? "";
      if (!text.trim()) {
        return NextResponse.json({ error: "No content provided." }, { status: 400 });
      }

      const prompt = `Generate exactly ${count} multiple-choice questions based on this content:\n\n---\n${text.slice(0, 12000)}\n---\n\n${JSON_SCHEMA}`;
      const result = await model.generateContent(prompt);
      raw = result.response.text();
    }

    // Strip markdown fences if the model wraps output anyway
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const questions = JSON.parse(cleaned) as GeneratedQuestion[];

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "Model returned unexpected format." }, { status: 502 });
    }

    const normalised = questions.slice(0, count).map((q) => {
      const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
      const idx = ["A", "B", "C", "D"].indexOf(q.correctLetter);
      return {
        prompt: q.prompt,
        options: opts,
        correctAnswer: opts[idx] ?? opts[0],
        weighting: Number(q.weighting) || 2,
      };
    });

    return NextResponse.json({ questions: normalised });
  } catch (err) {
    console.error("[quiz/generate]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
