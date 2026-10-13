"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { pageLabel } from "@/components/SessionCard";
import { applyFilters, EMPTY_FILTERS, type Filters } from "@/lib/filters";
import { compareNumber } from "@/lib/grading";
import { supabase } from "@/lib/supabase";
import type { GradingSession, Question } from "@/lib/types";

type WrongQuestion = Question & { grading_sessions: GradingSession };

export default function WrongPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [hideReviewed, setHideReviewed] = useState(true);
  const [items, setItems] = useState<WrongQuestion[]>([]);

  useEffect(() => {
    let q = supabase
      .from("questions")
      .select("*, grading_sessions!inner(*, workbooks!inner(*))")
      .in("result", ["wrong", "unanswered"]);
    if (hideReviewed) q = q.eq("reviewed", false);
    applyFilters(q, filters, "grading_sessions.").then(({ data }) => setItems((data as WrongQuestion[]) ?? []));
  }, [filters, hideReviewed]);

  async function toggleReviewed(q: WrongQuestion) {
    await supabase.from("questions").update({ reviewed: !q.reviewed }).eq("id", q.id!);
    setItems((xs) =>
      hideReviewed ? xs.filter((x) => x.id !== q.id) : xs.map((x) => (x.id === q.id ? { ...x, reviewed: !x.reviewed } : x)),
    );
  }

  // 채점 회차별로 묶어서 최신순 표시
  const groups = new Map<string, WrongQuestion[]>();
  for (const it of items) {
    const list = groups.get(it.session_id) ?? [];
    list.push(it);
    groups.set(it.session_id, list);
  }
  const sorted = [...groups.values()].sort((a, b) =>
    b[0].grading_sessions.graded_on.localeCompare(a[0].grading_sessions.graded_on),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">오답노트</h1>
      <FilterBar value={filters} onChange={setFilters} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={hideReviewed} onChange={(e) => setHideReviewed(e.target.checked)} />
        복습 완료한 문제 숨기기
      </label>
      <p className="text-sm text-gray-600">{items.length}문제</p>

      {sorted.map((list) => {
        const s = list[0].grading_sessions;
        return (
          <section key={s.id} className="card space-y-2">
            <Link href={`/grade/${s.id}/result`} className="block hover:text-indigo-600">
              <p className="font-semibold">{s.workbooks?.title} {pageLabel(s)}</p>
              <p className="text-xs text-gray-500">
                {[s.workbooks?.grade, s.workbooks?.subject, s.workbooks?.publisher, s.graded_on].filter(Boolean).join(" · ")}
              </p>
            </Link>
            <ul className="divide-y">
              {list.sort((a, b) => compareNumber(a.number, b.number)).map((q) => (
                <li key={q.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-14 font-bold text-red-600">{q.number}번</span>
                  <span className="flex-1">
                    정답 <b>{q.correct_answer}</b> · 내 답 {q.student_answer || "(미응답)"}
                  </span>
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input type="checkbox" checked={q.reviewed} onChange={() => toggleReviewed(q)} />
                    다시 풀었음
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {items.length === 0 && <p className="text-sm text-gray-500">복습할 오답이 없어요. 🎉</p>}
    </div>
  );
}
