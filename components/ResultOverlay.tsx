import type { Question } from "@/lib/types";

/** 풀이 사진 위에 오답(빨강)·미응답(주황) 영역을 표시 */
export function ResultOverlay({ src, questions }: { src: string; questions: Question[] }) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="채점한 문제집 사진" className="block w-full" />
      {questions
        .filter((q) => q.bbox && q.result && q.result !== "correct")
        .map((q) => (
          <div
            key={q.number}
            className={`absolute rounded-md border-[3px] ${q.result === "wrong" ? "border-red-500 bg-red-500/10" : "border-orange-400 bg-orange-400/10"}`}
            style={{
              left: `${q.bbox!.x * 100}%`,
              top: `${q.bbox!.y * 100}%`,
              width: `${q.bbox!.w * 100}%`,
              height: `${q.bbox!.h * 100}%`,
            }}
          >
            <span className="absolute -left-1 -top-3 rounded bg-red-500 px-1 text-xs font-bold text-white">
              {q.number}번 ✗
            </span>
          </div>
        ))}
    </div>
  );
}
