-- 정신나간채점 초기 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요.

-- 1) 문제집
create table public.workbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  publisher text not null default '',
  grade text not null default '',
  subject text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, title, publisher, grade, subject)
);

-- 2) 채점 1회 (문제집의 특정 페이지)
create table public.grading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workbook_id uuid not null references public.workbooks (id) on delete cascade,
  page_start int,
  page_end int,
  graded_on date not null default current_date,
  answer_key_image text,   -- Storage 경로
  student_image text,      -- Storage 경로
  score int,               -- 맞은 개수
  total int,               -- 전체 문항 수
  created_at timestamptz not null default now()
);

-- 3) 문항별 결과
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null references public.grading_sessions (id) on delete cascade,
  number text not null,
  correct_answer text not null default '',
  student_answer text not null default '',
  result text check (result in ('correct', 'wrong', 'unanswered')),
  bbox jsonb,              -- {x,y,w,h} 사진 대비 비율(0~1)
  reviewed boolean not null default false,
  unique (session_id, number)
);

create index on public.grading_sessions (user_id, graded_on desc);
create index on public.workbooks (user_id, grade, subject, publisher);
create index on public.questions (user_id, result);

-- 4) RLS: 본인 데이터만
alter table public.workbooks enable row level security;
alter table public.grading_sessions enable row level security;
alter table public.questions enable row level security;

create policy "own workbooks" on public.workbooks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sessions" on public.grading_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own questions" on public.questions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5) 사진 저장소: photos/{user_id}/{session_id}/answer.jpg
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "own photos read" on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos insert" on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos update" on storage.objects for update
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own photos delete" on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
