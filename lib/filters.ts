"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Workbook } from "./types";

export type Filters = {
  grade: string;
  subject: string;
  publisher: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  page: string;
};

export const EMPTY_FILTERS: Filters = {
  grade: "", subject: "", publisher: "", title: "", dateFrom: "", dateTo: "", page: "",
};

type FilterableQuery<T> = {
  eq(column: string, value: unknown): T;
  gte(column: string, value: unknown): T;
  lte(column: string, value: unknown): T;
};

/**
 * 필터를 Supabase 쿼리에 적용.
 * sessionPath: grading_sessions 컬럼까지의 경로 ("" 또는 "grading_sessions.")
 */
export function applyFilters<T extends FilterableQuery<T>>(q: T, f: Filters, sessionPath = ""): T {
  const wb = `${sessionPath}workbooks.`;
  if (f.grade) q = q.eq(`${wb}grade`, f.grade);
  if (f.subject) q = q.eq(`${wb}subject`, f.subject);
  if (f.publisher) q = q.eq(`${wb}publisher`, f.publisher);
  if (f.title) q = q.eq(`${wb}title`, f.title);
  if (f.dateFrom) q = q.gte(`${sessionPath}graded_on`, f.dateFrom);
  if (f.dateTo) q = q.lte(`${sessionPath}graded_on`, f.dateTo);
  if (f.page) {
    q = q.lte(`${sessionPath}page_start`, Number(f.page)).gte(`${sessionPath}page_end`, Number(f.page));
  }
  return q;
}

/** 지금까지 입력한 문제집 정보로 드롭다운 선택지 만들기 */
export function useWorkbookOptions() {
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  useEffect(() => {
    supabase
      .from("workbooks")
      .select("id,title,publisher,grade,subject")
      .then(({ data }) => setWorkbooks(data ?? []));
  }, []);
  const uniq = (key: keyof Workbook) =>
    [...new Set(workbooks.map((w) => w[key]).filter(Boolean))].sort();
  return {
    workbooks,
    grades: uniq("grade"),
    subjects: uniq("subject"),
    publishers: uniq("publisher"),
    titles: uniq("title"),
  };
}
