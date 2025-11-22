# 테스트 모드 가이드

## 📋 개요

프론트엔드 개발 및 테스트를 위해 백엔드 API 없이도 전체 기능을 확인할 수 있는 테스트 모드가 구현되어 있습니다.

## ✨ 테스트 모드 특징

### 1. 목(Mock) 데이터 사용
- **로컬 스토리지 기반**: 브라우저의 localStorage를 사용하여 데이터 저장
- **자동 샘플 데이터**: 첫 실행 시 8개의 샘플 포스트 자동 생성
- **영구 저장**: 브라우저를 닫아도 데이터 유지

### 2. 테스트 모드 활성화

**파일:** `frontend/lib/api.ts`

```typescript
// 테스트 모드: 백엔드 대신 로컬 스토리지 사용
const USE_MOCK_DATA = true;
```

- `USE_MOCK_DATA = true`: 목 데이터 사용 (테스트 모드)
- `USE_MOCK_DATA = false`: 실제 백엔드 API 호출

### 3. 샘플 데이터 구성

현재 8개의 샘플 포스트가 포함되어 있습니다:

| ID | 주제 | 모델 | 좋아요 |
|----|------|------|--------|
| 1 | React useEffect cleanup | GPT-4 | 12 |
| 2 | TypeScript 제네릭 | Claude 3 Opus | 8 |
| 3 | Next.js Server/Client Components | GPT-3.5 Turbo | 15 |
| 4 | async/await vs Promise | GPT-4 | 23 |
| 5 | Flexbox vs Grid | Claude 3 Sonnet | 19 |
| 6 | REST API vs GraphQL | GPT-4 Turbo | 31 |
| 7 | Docker vs 가상 머신 | Claude 3 Opus | 27 |
| 8 | JWT 보안 | GPT-4 | 42 |

## 🎯 테스트 가능한 기능

### 1. Dashboard (대시보드)
- ✅ 샘플 포스트 카드 목록 표시
- ✅ 프롬프트 미리보기 (3줄 제한)
- ✅ 모델 정보 배지
- ✅ 좋아요 기능
- ✅ 카드 클릭 → 상세 페이지 이동

### 2. Conversation (대화 상세)
- ✅ 프롬프트 전체 내용
- ✅ AI 답변 (Markdown 렌더링)
- ✅ 사용된 모델 정보
- ✅ 좋아요 토글
- ✅ 답변 복사
- ✅ 뒤로가기

### 3. Home (프롬프트 입력)
- ✅ 새 프롬프트 공유
- ✅ 로컬 스토리지에 저장
- ✅ Dashboard에 추가

## 🔧 테스트 모드 사용 방법

### 초기 설정
```powershell
cd D:\Develop\Lmarena\frontend
pnpm dev
```

### 테스트 시나리오

#### 1️⃣ 샘플 데이터 확인
1. 브라우저에서 `http://localhost:3000` 접속
2. Sidebar에서 **Dashboard** 클릭
3. 파란색 테스트 모드 배너 확인 (🧪 테스트 모드)
4. 8개의 샘플 포스트 카드 확인

#### 2️⃣ 상세 페이지 확인
1. 아무 카드나 클릭
2. Conversation 페이지로 이동
3. 프롬프트, 답변, 모델 정보 확인
4. 좋아요 버튼 클릭 → 숫자 증가 확인
5. 뒤로가기 → Dashboard 복귀

#### 3️⃣ 새 포스트 생성
1. **Home** 탭 클릭
2. 질문 입력 (예: "Python의 데코레이터는 무엇인가요?")
3. "Battle!" 버튼 클릭
4. AI 답변 확인 (실제 API는 필요 - 목 데이터만 응답용)
5. 공유 버튼(Share) 클릭
6. Toast 알림 확인
7. Dashboard로 이동 → 새 포스트 확인

#### 4️⃣ 좋아요 기능
1. Dashboard에서 카드의 좋아요 버튼 클릭
2. 숫자 증가/감소 확인
3. 색상 변경 확인 (회색 ↔ 빨강)
4. 상세 페이지에서도 동일하게 동작 확인

## 🧪 콘솔 로그 확인

테스트 모드에서는 각 API 호출마다 콘솔에 로그가 출력됩니다:

```javascript
🧪 Test mode: Using local storage for getPosts
🧪 Test mode: Using local storage for getPost
🧪 Test mode: Using local storage for likePost
🧪 Test mode: Using local storage for createPost
```

**콘솔 열기:**
- Windows/Linux: `F12` 또는 `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

## 💾 로컬 스토리지 관리

### 저장된 데이터 확인
1. 브라우저 개발자 도구 열기 (`F12`)
2. **Application** 탭 클릭
3. **Local Storage** → `http://localhost:3000` 선택
4. `lmarena_posts`: 포스트 데이터
5. `lmarena_post_likes`: 좋아요 상태

### 데이터 초기화
```javascript
// 콘솔에서 실행
localStorage.removeItem('lmarena_posts');
localStorage.removeItem('lmarena_post_likes');
// 페이지 새로고침
location.reload();
```

또는 개발자 도구에서:
1. Application → Local Storage
2. 항목 우클릭 → Delete
3. 페이지 새로고침

## 🔄 실제 백엔드로 전환

테스트 완료 후 실제 백엔드를 사용하려면:

**파일:** `frontend/lib/api.ts`

```typescript
// 테스트 모드 비활성화
const USE_MOCK_DATA = false;
```

이제 실제 백엔드 API가 호출됩니다:
- `POST /posts` - 포스트 생성
- `GET /posts` - 포스트 목록
- `GET /posts/:id` - 단일 포스트
- `POST /posts/:id/like` - 좋아요

## ⚠️ 주의사항

### 1. Arena API는 별도
현재 테스트 모드는 Posts API에만 적용됩니다. Arena API (프롬프트 입력 → AI 답변)는 실제 백엔드가 필요합니다.

```typescript
// 테스트 모드 적용 ✅
postsApi.getPosts()
postsApi.getPost(id)
postsApi.createPost(...)
postsApi.likePost(...)

// 테스트 모드 미적용 ❌ (실제 백엔드 필요)
arenaApi.createMatch(prompt, userId)
arenaApi.vote(matchId, chosen, userId)
```

### 2. 로컬 스토리지 제한
- 브라우저별로 약 5-10MB 제한
- 포스트가 많아지면 용량 초과 가능
- 실제 배포 시 백엔드 사용 필수

### 3. 데이터 동기화 없음
- 다른 브라우저/컴퓨터와 데이터 공유 안 됨
- 브라우저 캐시 삭제 시 데이터 손실
- 실시간 업데이트 불가

## 📊 테스트 체크리스트

- [ ] Dashboard 페이지 로드 (8개 샘플 데이터)
- [ ] 테스트 모드 배너 표시
- [ ] 카드 목록 그리드 레이아웃
- [ ] 모델 배지 표시
- [ ] 카드 클릭 → Conversation 이동
- [ ] 프롬프트 전체 표시
- [ ] AI 답변 Markdown 렌더링
- [ ] 모델 정보 헤더 표시
- [ ] 좋아요 버튼 동작 (Dashboard)
- [ ] 좋아요 버튼 동작 (Conversation)
- [ ] 뒤로가기 → Dashboard 복귀
- [ ] 답변 복사 버튼
- [ ] Toast 알림 표시
- [ ] 콘솔 로그 확인
- [ ] 로컬 스토리지 데이터 저장 확인

## 🎨 테스트 모드 UI

### Dashboard 배너
```
┌────────────────────────────────────────┐
│ 🧪 테스트 모드                         │
│ 샘플 데이터를 사용하여 기능을 테스트... │
└────────────────────────────────────────┘
```

파란색 배경, 눈에 잘 띄는 위치에 배치

## 💡 문제 해결

### Q: 샘플 데이터가 안 보여요
**A:** 브라우저를 새로고침하고, 콘솔에서 `🧪 Test mode` 로그를 확인하세요.

### Q: 좋아요가 저장이 안 돼요
**A:** localStorage가 활성화되어 있는지 확인하세요. 시크릿 모드에서는 제한될 수 있습니다.

### Q: 데이터를 리셋하고 싶어요
**A:** 콘솔에서 `localStorage.clear()` 실행 후 새로고침하세요.

### Q: 새 포스트를 추가했는데 안 보여요
**A:** Dashboard 페이지로 이동하면 최상단에 표시됩니다.

## 🚀 다음 단계

1. ✅ 테스트 모드로 모든 기능 확인
2. ⏭️ 백엔드 API 개발
3. ⏭️ `USE_MOCK_DATA = false`로 변경
4. ⏭️ 실제 데이터로 테스트
5. ⏭️ 프로덕션 배포

---

**작성일**: 2025-11-22
**테스트 모드 버전**: 1.0

