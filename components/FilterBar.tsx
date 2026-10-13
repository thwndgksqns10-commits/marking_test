"use client";

import { EMPTY_FILTERS, type Filters, useWorkbookOptions } from "@/lib/filters";

function Select(props: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="text-xs text-gray-600">
      {props.label}
      <select className="input mt-1" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
        <option value="">전체</option>
        {props.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

/** 엑셀 자동필터처럼 학년·과목·출판사·문제집·날짜·페이지로 골라보기 */
export function FilterBar({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  const opt = useWorkbookOptions();
  const set = (k: keyof Filters) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="card grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Select label="학년" value={value.grade} options={opt.grades} onChange={set("grade")} />
      <Select label="과목" value={value.subject} options={opt.subjects} onChange={set("subject")} />
      <Select label="출판사" value={value.publisher} options={opt.publishers} onChange={set("publisher")} />
      <Select label="문제집" value={value.title} options={opt.titles} onChange={set("title")} />
      <label className="text-xs text-gray-600">
        시작일
        <input type="date" className="input mt-1" value={value.dateFrom} onChange={(e) => set("dateFrom")(e.target.value)} />
      </label>
      <label className="text-xs text-gray-600">
        종료일
        <input type="date" className="input mt-1" value={value.dateTo} onChange={(e) => set("dateTo")(e.target.value)} />
      </label>
      <label className="text-xs text-gray-600">
        페이지
        <input type="number" min={1} className="input mt-1" value={value.page} onChange={(e) => set("page")(e.target.value)} />
      </label>
      <button type="button" className="btn-ghost self-end" onClick={() => onChange(EMPTY_FILTERS)}>
        필터 초기화
      </button>
    </div>
  );
}
