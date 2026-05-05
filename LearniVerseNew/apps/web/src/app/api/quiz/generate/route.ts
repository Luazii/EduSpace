import Anthropic, { toFile } from "@anthropic-ai/sdk";
import type { MessageParam, ContentBlockParam, Base64PDFSource } from "@anthropic-ai/sdk/resources/messages";
import { NextRequest, NextResponse } from "next/server";

// toFile imported for potential future use; suppress unused warning
void toFile;

const client = new Anthropic();

type GeneratedQuestion = {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctLetter: "A" | "B" | "C" | "D";
  weighting: number;
};

const SYSTEM_PROMPT = `You are an expert educator who creates high-quality multiple-choice quiz questions.
Given document content, generate clear, well-structured questions suitable for a high school or university assessment.

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Exactly one option must be correct
- Distractors (wrong answers) should be plausible but clearly wrong to a student who understands the material
- Questions should test understanding, not just memorisation
- Vary difficulty: include some straightforward recall and some application questions
- Return ONLY valid JSON — no markdown fences, no commentary`;

function buildUserPrompt(text: string, count: number): string {
  return `Generate exactly ${count} multiple-choice questions based on this content:

---
${text.slice(0, 12000)}
---

Respond with a JSON array. Each element must have these exact keys:
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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      text?: string;
      fileBase64?: string;
      mediaType?: string;
      questionCount?: number;
    };

    const count = Math.min(Math.max(Number(body.questionCount ?? 5), 1), 20);

    let questions: GeneratedQuestion[];

    if (body.fileBase64 && body.mediaType === "application/pdf") {
      // Use Claude's native document support for PDFs
      const docSource: Base64PDFSource = {
        type: "base64",
        media_type: "application/pdf",
        data: body.fileBase64,
      };
      const userContent: ContentBlockParam[] = [
        {
          type: "document",
          source: docSource,
          title: "Uploaded document",
        } as ContentBlockParam,
        {
          type: "text",
          text: `Generate exactly ${count} multiple-choice questions from this document.\n\nRespond with a JSON array. Each element must have:\n{\n  "prompt": "question text",\n  "optionA": "...",\n  "optionB": "...",\n  "optionC": "...",\n  "optionD": "...",\n  "correctLetter": "A" | "B" | "C" | "D",\n  "weighting": 2\n}\n\nReturn only the JSON array.`,
        },
      ];
      const pdfMessage: MessageParam = { role: "user", content: userContent };
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [pdfMessage],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      questions = JSON.parse(raw) as GeneratedQuestion[];
    } else {
      // Plain text path
      const text = body.text ?? "";
      if (!text.trim()) {
        return NextResponse.json({ error: "No content provided." }, { status: 400 });
      }

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(text, count) }],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";
      questions = JSON.parse(raw.trim()) as GeneratedQuestion[];
    }

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: "Model returned unexpected format." }, { status: 502 });
    }

    // Normalise to the quiz builder's format
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
