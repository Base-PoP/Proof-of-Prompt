# 대시보드 & 대화 상세 개요

프롬프트 공유 후 대시보드 카드와 상세 페이지에서 보여주는 기능을 정리했습니다. 현재 구현 상태 기준입니다.

## 목록(대시보드)
- 경로: `frontend/app/components/DashboardPage.tsx`
- 데이터: `GET /prompts` (정렬 `latest|popular`, 카테고리 필터 지원, 로그인 시 isLiked 포함)
- 카드 내용: 제목(또는 프롬프트 요약), 프롬프트 일부, 카테고리 배지, 모델명, 작성 시각, 좋아요 수.
- 사용자 기능:
  - 좋아요 토글: `POST /prompts/:id/like` (지갑 연결 필요, 중복 불가)
  - 작성자일 때 삭제(공유 취소): `DELETE /prompts/:id`
  - 카드 클릭 시 상세 이동: `onSelectPost(postId)`

## 공유 플로우
- Home에서 채팅 생성 후 `arenaApi.sharePrompt(matchId, walletAddress)` 호출.
- 백엔드가 LLM으로 제목/카테고리 생성 후 `Prompt.isShared=true`로 업데이트.
- 공유 직후 대시보드 목록 재로딩.

## 상세(ConversationPage)
- 경로: `frontend/app/components/ConversationPage.tsx`
- 데이터: `GET /prompts/:id` (로그인 시 isLiked 포함)
- 표시: 제목, 카테고리, 프롬프트 전체, 모델명, 답변(Markdown), 작성 시각, 좋아요 수.
- 작성자 기능: 제목/카테고리 수정 `PATCH /prompts/:id`, 삭제 `DELETE /prompts/:id`.
- 공통 기능: 좋아요 토글, 프롬프트/답변 복사, 뒤로가기 콜백.

## 테스트 모드
- `NEXT_PUBLIC_USE_MOCK_DATA=true`이면 프론트가 로컬스토리지 기반 목 데이터를 사용.
- 실서비스 모드는 `NEXT_PUBLIC_USE_MOCK_DATA=false`로 백엔드 API 호출.
