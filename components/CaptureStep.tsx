"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PhotoUploader } from "@/components/PhotoUploader";
import { compareNumber, gradeOne, summarize } from "@/lib/grading";
import { blobToBase64, resizeImage } from "@/lib/image";
import { photoUrl, uploadPhoto } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth";
import type { BBox, ExtractedItem, ExtractKind, GradingSession, Question } from "@/lib/types";

type Row = { number: string; correct: string; student: string; uncertain: boolean; bbox: BBox | null };

const TEXT: Record<"answer" | "student", { title: string; button: string; next: string }> = {
  answer: { title: "1단계 · 정답지 찍기", button: "정답지 사진 찍기", next: "다음: 푼 문제 찍기 →" },
  student: { title: "2단계 · 푼 문제집 찍기", button: "푼 페이지 사진 찍기", next: "채점하기 ✓" },
};

export function CaptureStep({ sessionId, kind }: { sessionId: string; kind: "answer" | "student" }) {
  const router = useRouter();
  const user = useUser();
  const [session, setSession] = useState<GradingSession | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기존에 저장된 세션·문항 불러오기
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("grading_sessions").select("*, workbooks(*)").eq("id", sessionId).single();
      const { data: qs } = await supabase.from("questions").select("*").eq("session_id", sessionId);
      setSession(s as GradingSession);
      setRows(
        ((qs as Question[]) ?? [])
          .sort((a, b) => compareNumber(a.number, b.number))
          .map((q) => ({ number: q.number, correct: q.correct_answer, student: q.student_answer, uncertain: false, bbox: q.bbox })),
      );
      const existing = kind === "answer" ? s?.answer_key_image : s?.student_image;
      setPreview(await photoUrl(existing ?? null));
    })();
  }, [sessionId, kind]);

  async function onPick(file: File) {
    setBusy(true);
    setError(null);
    try {
      setStatus("사진 줄이는 중…");
      const blob = await resizeImage(file);
      setPreview(URL.createObjectURL(blob));

      setStatus("사진 저장 중…");
      const path = `${user.id}/${sessionId}/${kind}.jpg`;
      await uploadPhoto(path, blob);
      await supabase
        .from("grading_sessions")
        .update(kind === "answer" ? { answer_key_image: path } : { student_image: path })
        .eq("id", sessionId);

      setStatus("Claude가 답을 읽는 중… (10~30초)");
      const { data: auth } = await supabase.auth.getSession();
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.session?.access_token}` },
        body: JSON.stringify({ image: await blobToBase64(blob), kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "인식 실패");
      mergeExtracted(json.items as ExtractedItem[]);
      setStatus("인식 완료! 아래 표를 확인하고 틀린 곳은 고쳐 주세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  function mergeExtracted(items: ExtractedItem[]) {
    setRows((prev) => {
      if (kind === "answer") {
        return items.map((it) => ({ number: it.number, correct: it.answer, student: "", uncertain: it.uncertain, bbox: null }));
      }
      // 학생 답: 같은 번호의 정답 행에 채워 넣기
      const byNum = new Map(items.map((it) => [it.number, it]));
      const merged = prev.map((r) => {
        const it = byNum.get(r.number);
        byNum.delete(r.number);
        return it ? { ...r, student: it.answer, uncertain: it.uncertain, bbox: it.bbox } : r;
      });
      for (const it of byNum.values()) {
        merged.push({ number: it.number, correct: "", student: it.answer, uncertain: it.uncertain, bbox: it.bbox });
      }
      return merged.sort((a, b) => compareNumber(a.number, b.number));
    });
  }

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch, uncertain: false } : r)));

  function addRows(n: number) {
    setRows((rs) => {
      const last = Number(rs.at(-1)?.number) || 0;
      const added = Array.from({ length: n }, (_, k) => ({
        number: String(last + k + 1), correct: "", student: "", uncertain: false, bbox: null,
      }));
      return [...rs, ...added];
    });
  }

  async function save() {
    const clean = rows.filter((r) => r.number.trim());
    if (clean.length === 0) return setError("문항이 하나도 없어요.");
    if (new Set(clean.map((r) => r.number)).size !== clean.length) return setError("같은 문항 번호가 두 번 있어요.");
    setBusy(true);
    setError(null);
    try {
      if (kind === "answer") {
        const { error: e1 } = await supabase.from("questions").upsert(
          clean.map((r) => ({ session_id: sessionId, number: r.number.trim(), correct_answer: r.correct.trim() })),
          { onConflict: "session_id,number" },
        );
        if (e1) throw e1;
        // 표에서 지운 문항은 DB에서도 삭제
        const keep = `(${clean.map((r) => `"${r.number.trim()}"`).join(",")})`;
        await supabase.from("questions").delete().eq("session_id", sessionId).not("number", "in", keep);
        router.push(`/grade/${sessionId}/student`);
      } else {
        const graded = clean.map((r) => ({
          session_id: sessionId,
          number: r.number.trim(),
          correct_answer: r.correct.trim(),
          student_answer: r.student.trim(),
          result: gradeOne(r.correct, r.student),
          bbox: r.bbox,
        }));
        const { error: e1 } = await supabase.from("questions").upsert(graded, { onConflict: "session_id,number" });
        if (e1) throw e1;
        const { score, total } = summarize(graded.map((g) => g.result));
        await supabase.from("grading_sessions").update({ score, total }).eq("id", sessionId);
        router.push(`/grade/${sessionId}/result`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const t = TEXT[kind];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t.title}</h1>
        {session?.workbooks && (
          <p className="text-sm text-gray-500">
            {session.workbooks.title} {session.page_start ? `· p.${session.page_start}` : ""}
          </p>
        )}
      </div>

      <PhotoUploader label={preview ? "다시 찍기" : t.button} onPick={onPick} disabled={busy} />
      {status && <p className="text-sm text-indigo-700">{status}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="촬영한 사진" className="max-h-72 w-full rounded-lg border object-contain" />
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="w-20 px-3 py-2">번호</th>
              <th className="px-3 py-2">정답</th>
              {kind === "student" && <th className="px-3 py-2">학생 답</th>}
              {kind === "student" && <th className="w-12 px-3 py-2">결과</th>}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const result = kind === "student" ? gradeOne(r.correct, r.student) : null;
              return (
                <tr key={i} className={`border-t ${r.uncertain ? "bg-yellow-50" : ""}`}>
                  <td className="px-2 py-1">
                    <input className="input" value={r.number} onChange={(e) => update(i, { number: e.target.value })} />
                  </td>
                  <td className="px-2 py-1">
                    <input className="input" value={r.correct} onChange={(e) => update(i, { correct: e.target.value })} />
                  </td>
                  {kind === "student" && (
                    <td className="px-2 py-1">
                      <input className="input" value={r.student} onChange={(e) => update(i, { student: e.target.value })} />
                    </td>
                  )}
                  {kind === "student" && (
                    <td className="px-3 text-center text-lg font-bold">
                      {result === "correct" ? <span className="text-green-600">O</span> : result === "wrong" ? <span className="text-red-600">X</span> : <span className="text-gray-400">-</span>}
                    </td>
                  )}
                  <td className="px-1">
                    <button type="button" aria-label="행 삭제" className="text-gray-400 hover:text-red-600" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  사진을 찍거나, 아래 버튼으로 직접 입력하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.uncertain) && <p className="text-xs text-amber-700">노란 줄은 Claude가 확신하지 못한 문항이에요. 꼭 확인해 주세요.</p>}

      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={() => addRows(1)}>+ 1문항</button>
        <button type="button" className="btn-ghost" onClick={() => addRows(10)}>+ 10문항</button>
      </div>

      <button type="button" className="btn-primary w-full py-3" disabled={busy || rows.length === 0} onClick={save}>
        {t.next}
      </button>
    </div>
  );
}
