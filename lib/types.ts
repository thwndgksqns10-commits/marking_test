export type Result = "correct" | "wrong" | "unanswered";

export type BBox = { x: number; y: number; w: number; h: number };

export type Workbook = {
  id: string;
  title: string;
  publisher: string;
  grade: string;
  subject: string;
};

export type GradingSession = {
  id: string;
  workbook_id: string;
  page_start: number | null;
  page_end: number | null;
  graded_on: string;
  answer_key_image: string | null;
  student_image: string | null;
  score: number | null;
  total: number | null;
  created_at: string;
  workbooks?: Workbook;
};

export type Question = {
  id?: string;
  session_id: string;
  number: string;
  correct_answer: string;
  student_answer: string;
  result: Result | null;
  bbox: BBox | null;
  reviewed: boolean;
};

/** Claude가 사진에서 읽어낸 한 문항 */
export type ExtractedItem = {
  number: string;
  answer: string;
  uncertain: boolean;
  bbox: BBox | null;
};

export type ExtractKind = "answer" | "student" | "auto";

/** 푼 사진 한 장으로 바로 채점할 때: 정답(Claude가 직접 풂) + 학생 답 */
export type AutoItem = ExtractedItem & { correct: string };
