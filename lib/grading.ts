import type { Result } from "./types";

/**
 * 답 비교용 정규화
 * - NFKC: 전각→반각, ①→1 등
 * - 공백 제거, 소문자, 바깥 괄호/끝 마침표 제거
 * - "2, 4" 와 "4,2" 처럼 복수 정답은 정렬해서 비교
 */
export function normalize(answer: string): string {
  let s = answer.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
  s = s.replace(/\.$/, "").replace(/^\((.*)\)$/, "$1");
  if (s.includes(",")) s = s.split(",").filter(Boolean).sort().join(",");
  return s;
}

export function gradeOne(correct: string, student: string): Result {
  const st = normalize(student);
  if (!st) return "unanswered";
  return normalize(correct) === st ? "correct" : "wrong";
}

export function summarize(results: (Result | null)[]) {
  return {
    score: results.filter((r) => r === "correct").length,
    total: results.length,
  };
}

/** "3", "12-1", "3(1)" 같은 문항번호를 자연스러운 순서로 정렬 */
export function compareNumber(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true });
}
