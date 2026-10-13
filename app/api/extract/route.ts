import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PROMPTS } from "@/lib/prompts";

const ItemsSchema = z.object({
  items: z.array(
    z.object({
      number: z.string(),
      answer: z.string(),
      uncertain: z.boolean(),
      bbox: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).nullable(),
    }),
  ),
});

const AutoSchema = z.object({
  items: z.array(
    z.object({
      number: z.string(),
      answer: z.string(),
      correct: z.string(),
      uncertain: z.boolean(),
      bbox: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).nullable(),
    }),
  ),
});

const BodySchema = z.object({
  image: z.string().min(1), // base64 JPEG (data: 접두어 없이)
  kind: z.enum(["answer", "student", "auto"]),
});

// 데모 모드(키 없음)에서 돌려줄 가짜 인식 결과: 학생 답 중 4·7·9번이 틀리거나 비어 있음
const DEMO_KEY = ["②", "④", "①", "③", "⑤", "②", "15", "④", "①", "③"];
const DEMO_STUDENT = ["②", "④", "①", "②", "⑤", "②", "", "④", "③", "③"];
function demoItems(kind: string) {
  const src = kind === "answer" ? DEMO_KEY : DEMO_STUDENT;
  return src.map((answer, i) => ({
    number: String(i + 1),
    answer,
    correct: DEMO_KEY[i],
    uncertain: i === 7,
    bbox: kind !== "answer" ? { x: i % 2 ? 0.52 : 0.04, y: 0.05 + Math.floor(i / 2) * 0.18, w: 0.44, h: 0.15 } : null,
  }));
}

export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.ANTHROPIC_API_KEY) {
    const { kind } = await req.json();
    await new Promise((r) => setTimeout(r, 2500));
    return Response.json({ items: demoItems(kind) });
  }
  const anthropic = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용

  // 1) 익명이라도 로그인한 사용자만 호출 가능 (API 키 남용 방지)
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: auth } = await supabase.auth.getUser(token);
  if (!auth.user) return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) return Response.json({ error: "잘못된 요청" }, { status: 400 });

  // 2) Claude에 사진 + 프롬프트 전달, JSON 스키마로 응답 강제
  try {
    const response = await anthropic.messages.parse({
      model: process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: body.data.image } },
            { type: "text", text: PROMPTS[body.data.kind] },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(body.data.kind === "auto" ? AutoSchema : ItemsSchema), effort: body.data.kind === "auto" ? "high" : "medium" },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "사진을 읽지 못했습니다. 다시 찍어 주세요." }, { status: 422 });
    }
    return Response.json(response.parsed_output);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "요청이 많습니다. 잠시 후 다시 시도하세요." }, { status: 429 });
    }
    if (e instanceof Anthropic.APIError) {
      console.error("Claude API error", e.status, e.message);
      return Response.json({ error: "인식 서버 오류" }, { status: 502 });
    }
    throw e;
  }
}
