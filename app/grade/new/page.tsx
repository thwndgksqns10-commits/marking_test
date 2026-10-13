"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ComboInput } from "@/components/ComboInput";
import { GRADES, SUBJECTS } from "@/lib/constants";
import { useWorkbookOptions } from "@/lib/filters";
import { gradeOne, summarize } from "@/lib/grading";
import { blobToBase64, resizeImage } from "@/lib/image";
import { uploadPhoto } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/auth";
import type { AutoItem } from "@/lib/types";

const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (현지 시간)

/** 푼 문제집 사진 한 장 → Claude가 답 읽고 직접 풀어서 → 바로 채점 */
export default function NewGrading() {
  const router = useRouter();
  const user = useUser();
  const opt = useWorkbookOptions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ grade: "", subject: "", publisher: "", title: "", page: "" });
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const busy = status != null;

  const pickTitle = (title: string) => {
    const wb = opt.workbooks.find((w) => w.title === title);
    setForm((f) => (wb ? { ...f, title, grade: wb.grade, subject: wb.subject, publisher: wb.publisher } : { ...f, title }));
  };

  async function grade(file: File) {
    setError(null);
    try {
      setStatus("사진 준비 중…");
      const blob = await resizeImage(file);
      setPreview(URL.createObjectURL(blob));

      const { data: wb, error: wbErr } = await supabase
        .from("workbooks")
        .upsert(
          {
            title: form.title.trim() || "빠른 채점",
            publisher: form.publisher.trim(),
            grade: form.grade.trim(),
            subject: form.subject.trim(),
          },
          { onConflict: "user_id,title,publisher,grade,subject" },
        )
        .select("id")
        .single();
      if (wbErr) throw wbErr;
      const page = form.page ? Number(form.page) : null;
      const { data: session, error: sErr } = await supabase
        .from("grading_sessions")
        .insert({ workbook_id: wb.id, page_start: page, page_end: page, graded_on: today() })
        .select("id")
        .single();
      if (sErr) throw sErr;

      const path = `${user.id}/${session.id}/student.jpg`;
      await uploadPhoto(path, blob);
      await supabase.from("grading_sessions").update({ student_image: path }).eq("id", session.id);

      setStatus("문제를 스캔하고 채점하는 중…");
      const { data: auth } = await supabase.auth.getSession();
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.session?.access_token}` },
        body: JSON.stringify({ image: await blobToBase64(blob), kind: "auto" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "인식 실패");

      const graded = (json.items as AutoItem[]).map((it) => ({
        session_id: session.id,
        number: it.number,
        correct_answer: it.correct,
        student_answer: it.answer,
        result: gradeOne(it.correct, it.answer),
        bbox: it.bbox,
      }));
      if (graded.length === 0) throw new Error("문제를 찾지 못했어요. 페이지 전체가 보이게 다시 찍어 주세요.");
      const { error: qErr } = await supabase.from("questions").upsert(graded, { onConflict: "session_id,number" });
      if (qErr) throw qErr;
      const { score, total } = summarize(graded.map((g) => g.result));
      await supabase.from("grading_sessions").update({ score, total }).eq("id", session.id);

      setStatus("채점 완료!");
      router.push(`/grade/${session.id}/result`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">푼 문제집을 찍어 주세요</h1>
        <p className="mt-1 text-sm text-gray-500">사진을 올리면 바로 스캔해서 채점해요.</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) grade(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) grade(f);
        }}
        className={`relative flex aspect-[3/4] max-h-[60vh] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition sm:aspect-[4/3] ${
          dragging ? "border-indigo-500 bg-indigo-50" : "border-indigo-300 bg-white hover:bg-indigo-50/50"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="올린 사진" className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <>
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-4xl shadow-lg">📷</span>
            <span className="mt-4 text-lg font-bold text-indigo-700">사진 찍기 / 올리기</span>
            <span className="mt-1 text-xs text-gray-500">휴대폰은 카메라가 열려요 · PC는 끌어다 놓아도 돼요</span>
          </>
        )}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-indigo-950/40 text-white">
            <div className="scan-line absolute inset-x-0 h-1 bg-indigo-300 shadow-[0_0_20px_6px_rgba(165,180,252,0.8)]" />
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/40 border-t-white" />
            <span className="mt-3 rounded-full bg-black/40 px-3 py-1 text-sm font-semibold">{status}</span>
          </div>
        )}
      </button>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error} <button type="button" className="underline" onClick={() => fileRef.current?.click()}>다시 찍기</button>
        </p>
      )}

      <details className="card">
        <summary className="cursor-pointer text-sm font-semibold text-gray-700">
          문제집 정보 (선택) <span className="font-normal text-gray-400">· 기록·오답노트 정리에 쓰여요</span>
        </summary>
        <div className="mt-4 space-y-4">
          <ComboInput label="문제집 이름" value={form.title} onChange={pickTitle} options={opt.titles} />
          <div className="grid grid-cols-2 gap-3">
            <ComboInput label="학년" value={form.grade} onChange={set("grade")} options={[...new Set([...GRADES, ...opt.grades])]} />
            <ComboInput label="과목" value={form.subject} onChange={set("subject")} options={[...new Set([...SUBJECTS, ...opt.subjects])]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ComboInput label="출판사" value={form.publisher} onChange={set("publisher")} options={opt.publishers} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">페이지</span>
              <input type="number" min={1} className="input" value={form.page} onChange={(e) => set("page")(e.target.value)} />
            </label>
          </div>
        </div>
      </details>
    </div>
  );
}
