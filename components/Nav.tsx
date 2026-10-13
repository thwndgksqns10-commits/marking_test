import Link from "next/link";
import { DEMO_MODE } from "@/lib/supabase";

export function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="mr-auto text-lg font-bold text-indigo-600">
          정신나간채점
        </Link>
        <Link href="/grade/new" className="hover:text-indigo-600">새 채점</Link>
        <Link href="/history" className="hover:text-indigo-600">기록</Link>
        <Link href="/wrong" className="hover:text-indigo-600">오답노트</Link>
      </nav>
      {DEMO_MODE && (
        <p className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-800">
          데모 모드 · 키 없이 체험 중 (데이터는 이 브라우저에만 저장, 사진 인식은 예시 결과)
        </p>
      )}
    </header>
  );
}
