"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

const UserContext = createContext<User | null>(null);

/** 회원가입 없이: 세션이 없으면 익명 사용자로 자동 로그인 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return setUser(data.session.user);
      const res = await supabase.auth.signInAnonymously();
      if (res.error) setError(res.error.message);
      else setUser(res.data.user);
    })();
  }, []);

  if (error)
    return (
      <p className="p-6 text-red-600">
        접속 실패: {error}
        <br />
        (Supabase 대시보드에서 Anonymous Sign-ins가 켜져 있는지 확인하세요)
      </p>
    );
  if (!user) return <p className="p-6 text-gray-500">불러오는 중…</p>;
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser must be used inside AuthGate");
  return user;
}
