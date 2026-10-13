import Link from "next/link";
import type { GradingSession } from "@/lib/types";

export function pageLabel(s: Pick<GradingSession, "page_start" | "page_end">) {
  if (s.page_start == null) return "";
  return s.page_end && s.page_end !== s.page_start ? `p.${s.page_start}~${s.page_end}` : `p.${s.page_start}`;
}

export function SessionCard({ s }: { s: GradingSession }) {
  const graded = s.total != null;
  const href = graded ? `/grade/${s.id}/result` : `/grade/${s.id}/answer-key`;
  const pct = graded && s.total ? Math.round(((s.score ?? 0) / s.total) * 100) : null;
  return (
    <Link href={href} className="card flex items-center gap-3 hover:border-indigo-300">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{s.workbooks?.title}</p>
        <p className="text-xs text-gray-500">
          {[s.workbooks?.grade, s.workbooks?.subject, s.workbooks?.publisher, pageLabel(s), s.graded_on]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {graded ? (
        <div className="text-right">
          <p className={`text-lg font-bold ${pct! >= 80 ? "text-green-600" : pct! >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {s.score}/{s.total}
          </p>
          <p className="text-xs text-gray-500">{pct}점</p>
        </div>
      ) : (
        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">채점 중</span>
      )}
    </Link>
  );
}
