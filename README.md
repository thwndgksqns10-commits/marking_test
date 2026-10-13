# 정신나간채점

**정**확 · **신**속 · **나**이스 · **간**단 **채점** — 문제집 사진으로 자동 채점하는 앱

Next.js(화면·서버) + Supabase(DB·사진 저장·익명 로그인) + Claude API(사진 속 답 읽기)

## 처음 실행하기

### 1. Supabase 준비 (무료)
1. https://supabase.com 에서 새 프로젝트를 만듭니다.
2. **SQL Editor**에 [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) 내용을 전부 붙여넣고 **Run**을 누릅니다.
3. **Authentication → Sign In / Providers**에서 **Allow anonymous sign-ins**를 켭니다. (회원가입 없이 쓰려면 꼭 필요해요)
4. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사해 둡니다.

### 2. Claude API 키
https://console.anthropic.com 에서 API 키를 발급받습니다. (사진 1장당 몇 원 정도 비용이 들어요)

### 3. 환경변수
`.env.local.example` 파일을 복사해서 `.env.local`을 만들고 값을 채웁니다.

### 4. 실행
```bash
npm install
```
```bash
npm run dev
```
브라우저에서 http://localhost:3000 을 엽니다.
휴대폰으로 테스트하려면 같은 와이파이에서 `http://<내 PC IP>:3000`으로 접속하세요.

## 사용 흐름
1. **새 채점**: 문제집 이름·학년·과목·출판사·페이지 입력 (한 번 입력한 값은 다음부터 드롭다운에 나와요)
2. **정답지 찍기** → Claude가 읽은 정답을 표에서 확인·수정
3. **푼 문제 찍기** → 학생 답 확인·수정 → **채점하기**
4. **결과**: 점수, 사진 위 오답 표시, O/X를 눌러 직접 바꾸기 (주관식용)
5. **기록 / 오답노트**: 학년·과목·출판사·문제집·날짜·페이지로 필터링

## 폴더 구조
| 위치 | 하는 일 |
|---|---|
| `app/` | 화면(페이지)들. 폴더 이름이 곧 주소 |
| `app/api/extract/route.ts` | 사진을 Claude에 보내 답을 JSON으로 받는 서버 코드 |
| `components/` | 여러 화면에서 같이 쓰는 부품 (사진 업로드, 필터 바, 오답 표시 등) |
| `lib/grading.ts` | 채점 규칙 (③ = 3, 공백 무시 등). `npm test`로 테스트 |
| `lib/prompts.ts` | Claude에게 주는 지시문. 인식이 아쉬우면 여기를 고치세요 |
| `supabase/migrations/` | DB 테이블과 보안 규칙 |

## 배포
GitHub에 올린 뒤 https://vercel.com 에서 가져오고, 환경변수 4개를 똑같이 넣으면 됩니다.
