"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ResultOverlay } from "@/components/ResultOverlay";
import { pageLabel } from "@/components/SessionCard";
import { compareNumber, summarize } from "@/lib/grading";
import { photoUrl } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import type { GradingSession, Question, Result } from "@/lib/types";

const NEXT_RESULT: Record<Result, Result> = { correct: "wrong", wrong: "correct", unanswered: "correct" };

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<GradingSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [img, setImg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("grading_sessions").select("*, workbooks(*)").eq("id", id).single();
      const { data: qs } = await supabase.from("questions").select("*").eq("session_id", id);
      setSession(s as GradingSession);
      setQuestions(((qs as Question[]) ?? []).sort((a, b) => compareNumber(a.number, b.number)));
      setImg(await photoUrl(s?.student_image ?? null));
    })();
  }, [id]);

  // 주관식 등 자동 판정이 애매할 때: 결과를 눌러 직접 O/X 바꾸기
  async function toggle(q: Question) {
    const result = NEXT_RESULT[q.result ?? "unanswered"];
    const next = questions.map((x) => (x.id === q.id ? { ...x, result } : x));
    setQuestions(next);
    await supabase.from("questions").update({ result }).eq("id", q.id!);
    const { score, total } = summarize(next.map((x) => x.result));
    await supabase.from("grading_sessions").update({ score, total }).eq("id", id);
    setSession((s) => (s ? { ...s, score, total } : s));
  }

  if (!session) return <p className="text-gray-500">불러오는 중…</p>;
  const { score, total } = summarize(questions.map((q) => q.result));
  const pct = total ? Math.round((score / total) * 100) : 0;
  const wrong = questions.filter((q) => q.result !== "correct");

  return (
    <div className="space-y-5">
      <div className="card text-center">
        <p className="text-sm text-gray-500">
          {session.workbooks?.title} {pageLabel(session)} · {session.graded_on}
        </p>
        <p className="mt-2 text-5xl font-extrabold text-indigo-600">{pct}점</p>
        <p className="mt-1 text-gray-600">
          {total}문제 중 <b className="text-green-600">{score}개</b> 정답 · <b className="text-red-600">{wrong.length}개</b> 오답/미응답
        </p>
      </div>

      {img && <ResultOverlay src={img} questions={questions} />}

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">번호</th>
              <th className="px-3 py-2">정답</th>
              <th className="px-3 py-2">학생 답</th>
              <th className="px-3 py-2 text-center">결과 (눌러서 변경)</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className={`border-t ${q.result === "correct" ? "" : "bg-red-50"}`}>
                <td className="px-3 py-2 font-medium">{q.number}</td>
                <td className="px-3 py-2">{q.correct_answer}</td>
                <td className="px-3 py-2">{q.student_answer || <span className="text-gray-400">(미응답)</span>}</td>
                <td className="px-3 py-2 text-center">
                  <button type="button" onClick={() => toggle(q)} className="text-xl font-bold">
                    {q.result === "correct" ? <span className="text-green-600">O</span> : <span className="text-red-600">X</span>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Link href={`/grade/${id}/student`} className="btn-ghost">답 고치기</Link>
        <Link href="/wrong" className="btn-ghost">오답노트</Link>
        <Link href="/grade/new" className="btn-primary">다음 장 찍기</Link>
      </div>
    </div>
  );
}
