"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionCard } from "@/components/SessionCard";
import { supabase } from "@/lib/supabase";
import type { GradingSession } from "@/lib/types";

export default function Home() {
  const [recent, setRecent] = useState<GradingSession[]>([]);
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    supabase
      .from("grading_sessions")
      .select("*, workbooks(*)")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setRecent((data as GradingSession[]) ?? []));
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .in("result", ["wrong", "unanswered"])
      .eq("reviewed", false)
      .then(({ count }) => setWrongCount(count ?? 0));
  }, []);

  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="text-3xl font-extrabold">
          <span className="text-indigo-600">정</span>확 · <span className="text-indigo-600">신</span>속 ·{" "}
          <span className="text-indigo-600">나</span>이스 · <span className="text-indigo-600">간</span>단{" "}
          <span className="text-indigo-600">채점</span>
        </h1>
        <p className="mt-2 text-sm text-gray-500">푼 문제집을 찍으면 자동으로 채점해요.</p>
      </section>

      <Link href="/grade/new" className="btn-primary block py-5 text-center text-lg">
        ✏️ 새 채점 시작
      </Link>

      <Link href="/wrong" className="card flex items-center justify-between hover:border-red-300">
        <span>복습할 오답</span>
        <span className="text-2xl font-bold text-red-600">{wrongCount}개</span>
      </Link>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">최근 채점</h2>
          <Link href="/history" className="text-sm text-indigo-600">전체 보기 →</Link>
        </div>
        {recent.length === 0 && <p className="text-sm text-gray-500">아직 채점 기록이 없어요.</p>}
        {recent.map((s) => (
          <SessionCard key={s.id} s={s} />
        ))}
      </section>
    </div>
  );
}
