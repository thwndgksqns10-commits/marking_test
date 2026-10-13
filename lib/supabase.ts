import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { demoClient } from "./demo";

/** Supabase 키가 없으면 데모 모드 (브라우저에만 저장되는 가짜 DB) */
export const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL;

// 브라우저용 Supabase 클라이언트 (익명 로그인 세션을 localStorage에 저장)
export const supabase: SupabaseClient = DEMO_MODE
  ? demoClient
  : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
