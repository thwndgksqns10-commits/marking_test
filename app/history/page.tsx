"use client";

import { useEffect, useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import { SessionCard } from "@/components/SessionCard";
import { applyFilters, EMPTY_FILTERS, type Filters } from "@/lib/filters";
import { supabase } from "@/lib/supabase";
import type { GradingSession } from "@/lib/types";

export default function HistoryPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sessions, setSessions] = useState<GradingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = supabase
      .from("grading_sessions")
      .select("*, workbooks!inner(*)")
      .order("graded_on", { ascending: false })
      .order("created_at", { ascending: false });
    applyFilters(q, filters).then(({ data }) => {
      setSessions((data as GradingSession[]) ?? []);
      setLoading(false);
    });
  }, [filters]);

  const graded = sessions.filter((s) => s.total);
  const avg = graded.length
    ? Math.round(graded.reduce((sum, s) => sum + (s.score ?? 0) / s.total!, 0) / graded.length * 100)
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">채점 기록</h1>
      <FilterBar value={filters} onChange={setFilters} />
      <p className="text-sm text-gray-600">
        {sessions.length}건{avg != null && ` · 평균 ${avg}점`}
      </p>
      {loading ? (
        <p className="text-gray-500">불러오는 중…</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <SessionCard key={s.id} s={s} />
          ))}
          {sessions.length === 0 && <p className="text-sm text-gray-500">조건에 맞는 기록이 없어요.</p>}
        </div>
      )}
    </div>
  );
}
