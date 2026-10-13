/**
 * 데모 모드: Supabase 키가 없을 때 쓰는 가짜 클라이언트.
 * 이 앱이 실제로 쓰는 쿼리 모양만 흉내 내고, 데이터는 브라우저 localStorage에 저장한다.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;
type Tables = { workbooks: Row[]; grading_sessions: Row[]; questions: Row[] };

const KEY = "jsc-demo-db";
const PHOTO_KEY = "jsc-demo-photos";
const memPhotos = new Map<string, string>();
const uid = () => crypto.randomUUID();

function seed(): Tables {
  const wb1 = { id: uid(), user_id: "demo", title: "쎈 수학", publisher: "좋은책신사고", grade: "중1", subject: "수학" };
  const wb2 = { id: uid(), user_id: "demo", title: "자이스토리 영어", publisher: "수경출판사", grade: "중2", subject: "영어" };
  const s1 = mkSession(wb1.id, 12, 13, "2026-10-04", 8, 10);
  const s2 = mkSession(wb2.id, 30, 30, "2026-10-05", 4, 5);
  const q = (sid: string, n: number, c: string, st: string, result: string) => ({
    id: uid(), session_id: sid, number: String(n), correct_answer: c, student_answer: st, result, bbox: null, reviewed: false,
  });
  return {
    workbooks: [wb1, wb2],
    grading_sessions: [s1, s2],
    questions: [
      ...["③", "①", "④", "②", "⑤", "③", "12", "①", "②", "④"].map((c, i) =>
        q(s1.id, i + 1, c, i === 3 ? "③" : i === 6 ? "" : c, i === 3 ? "wrong" : i === 6 ? "unanswered" : "correct")),
      ...["②", "④", "①", "⑤", "went"].map((c, i) =>
        q(s2.id, i + 1, c, i === 4 ? "goed" : c, i === 4 ? "wrong" : "correct")),
    ],
  };
}

function mkSession(workbook_id: string, ps: number, pe: number, d: string, score: number | null, total: number | null) {
  return {
    id: uid(), user_id: "demo", workbook_id, page_start: ps, page_end: pe, graded_on: d,
    answer_key_image: null, student_image: null, score, total, created_at: new Date(d).toISOString(),
  };
}

let cache: Tables | null = null;
function db(): Tables {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (cache = JSON.parse(raw));
  } catch {}
  cache = seed();
  persist();
  return cache;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
}

function getPath(row: Row, path: string): any {
  return path.split(".").reduce((v, k) => (v == null ? v : v[k]), row as any);
}

function withJoins(table: keyof Tables, row: Row, select: string): Row {
  const d = db();
  const out = { ...row };
  if (table === "grading_sessions" && select.includes("workbooks")) {
    out.workbooks = d.workbooks.find((w) => w.id === row.workbook_id);
  }
  if (table === "questions" && select.includes("grading_sessions")) {
    const s = d.grading_sessions.find((x) => x.id === row.session_id);
    out.grading_sessions = s && { ...s, workbooks: d.workbooks.find((w) => w.id === s.workbook_id) };
  }
  return out;
}

class Query implements PromiseLike<any> {
  private filters: ((r: Row) => boolean)[] = [];
  private orders: [string, boolean][] = [];
  private lim: number | null = null;
  private selectStr: string | null = null;
  private countOnly = false;
  private isSingle = false;
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private payload: any = null;
  private conflict: string[] = [];

  constructor(private table: keyof Tables) {}

  select(s = "*", opts?: { head?: boolean; count?: string }) {
    this.selectStr = s;
    if (opts?.head) this.countOnly = true;
    return this;
  }
  insert(p: any) { this.op = "insert"; this.payload = p; return this; }
  upsert(p: any, o?: { onConflict?: string }) {
    this.op = "upsert"; this.payload = p; this.conflict = o?.onConflict?.split(",") ?? ["id"]; return this;
  }
  update(p: any) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push((r) => getPath(r, c) === v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => getPath(r, c) != null && getPath(r, c) >= v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => getPath(r, c) != null && getPath(r, c) <= v); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.includes(getPath(r, c))); return this; }
  not(c: string, op: string, v: string) {
    if (op === "in") {
      const list = v.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      this.filters.push((r) => !list.includes(String(getPath(r, c))));
    }
    return this;
  }
  order(c: string, o?: { ascending?: boolean }) { this.orders.push([c, o?.ascending ?? true]); return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.isSingle = true; return this; }

  private run(): { data: any; error: any; count?: number } {
    const d = db();
    const rows = d[this.table];
    const sel = this.selectStr ?? "*";
    const match = () => rows.map((r) => withJoins(this.table, r, sel)).filter((r) => this.filters.every((f) => f(r)));

    let result: Row[] = [];
    if (this.op === "select") {
      result = match();
      for (const [c, asc] of [...this.orders].reverse()) {
        result.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
      }
      if (this.lim != null) result = result.slice(0, this.lim);
      if (this.countOnly) return { data: null, error: null, count: result.length };
    } else if (this.op === "insert" || this.op === "upsert") {
      const items: Row[] = Array.isArray(this.payload) ? this.payload : [this.payload];
      for (const it of items) {
        const existing = this.op === "upsert"
          ? rows.find((r) => this.conflict.every((k) => k === "user_id" || r[k] === it[k]))
          : undefined;
        if (existing) { Object.assign(existing, it); result.push(existing); }
        else {
          const row = { ...defaults(this.table), ...it, id: uid() };
          rows.push(row); result.push(row);
        }
      }
      persist();
    } else if (this.op === "update") {
      const ids = new Set(match().map((r) => r.id));
      for (const r of rows) if (ids.has(r.id)) { Object.assign(r, this.payload); result.push(r); }
      persist();
    } else if (this.op === "delete") {
      const ids = new Set(match().map((r) => r.id));
      d[this.table] = rows.filter((r) => !ids.has(r.id));
      persist();
    }
    return { data: this.isSingle ? (result[0] ?? null) : result, error: null };
  }

  then<A, B>(ok?: ((v: any) => A | PromiseLike<A>) | null, bad?: ((e: any) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.run()).then(ok, bad);
  }
}

function defaults(t: keyof Tables): Row {
  if (t === "grading_sessions")
    return { user_id: "demo", answer_key_image: null, student_image: null, score: null, total: null, created_at: new Date().toISOString() };
  if (t === "questions") return { correct_answer: "", student_answer: "", result: null, bbox: null, reviewed: false };
  return { user_id: "demo" };
}

const demoUser = { id: "demo-user", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" };

function readPhotos(): Record<string, string> {
  try { return JSON.parse(sessionStorage.getItem(PHOTO_KEY) ?? "{}"); } catch { return {}; }
}

export const demoClient: any = {
  from: (t: keyof Tables) => new Query(t),
  auth: {
    getSession: async () => ({ data: { session: { user: demoUser, access_token: "demo" } } }),
    signInAnonymously: async () => ({ data: { user: demoUser }, error: null }),
  },
  storage: {
    from: () => ({
      upload: async (path: string, blob: Blob) => {
        const url = await new Promise<string>((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.readAsDataURL(blob);
        });
        memPhotos.set(path, url);
        try { sessionStorage.setItem(PHOTO_KEY, JSON.stringify({ ...readPhotos(), [path]: url })); } catch {}
        return { error: null };
      },
      createSignedUrl: async (path: string) => ({ data: { signedUrl: memPhotos.get(path) ?? readPhotos()[path] ?? null } }),
    }),
  },
};
