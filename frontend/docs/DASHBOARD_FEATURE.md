# 대시보드 & 대화 페이지 기능

## 📋 개요

BattlePage를 DashboardPage로 변경하고, 프롬프트 카드를 클릭하면 상세 대화 페이지로 이동하여 프롬프트, AI 답변, 사용된 모델 정보를 확인할 수 있는 기능을 구현했습니다.

## ✨ 주요 변경사항

### 1. DashboardPage (기존 BattlePage 대체)

**파일:** `frontend/app/components/DashboardPage.tsx`

#### 주요 기능
- **카드 형식 프롬프트 목록**: 그리드 레이아웃으로 공유된 프롬프트 표시
- **프롬프트 미리보기**: 3줄까지만 표시 (line-clamp-3)
- **모델 정보 배지**: 사용된 AI 모델 표시
- **좋아요 기능**: 카드 하단에 좋아요 버튼
- **클릭 시 상세 페이지 이동**: 카드 전체를 클릭하면 ConversationPage로 이동

#### UI 특징
```typescript
// 3열 그리드 레이아웃 (반응형)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {posts.map((post) => (
    <Card onClick={() => handleCardClick(post.id)} ...>
      {/* 프롬프트 미리보기 */}
      <p className="line-clamp-3">{post.prompt}</p>
      
      {/* 모델 배지 */}
      <span>{post.modelName}</span>
      
      {/* 좋아요 버튼 */}
      <button onClick={(e) => handleLike(post.id, e)}>...</button>
    </Card>
  ))}
</div>
```

### 2. ConversationPage (새로 추가)

**파일:** `frontend/app/components/ConversationPage.tsx`

#### 주요 기능
- **포스트 상세 정보 표시**
  - 작성자 정보 (아바타, 이름, 작성 시간)
  - 사용된 AI 모델 정보 (파란색 배지)
  - 좋아요 버튼
- **프롬프트 표시**: 파란색 배경의 메시지 버블 형태
- **AI 답변 표시**: Markdown 렌더링 지원
- **뒤로가기 버튼**: Dashboard로 복귀

#### UI 구조
```
┌─────────────────────────────────────┐
│ ← 돌아가기                          │
├─────────────────────────────────────┤
│ 👤 사용자 | ⏰ 시간 | 🤖 모델 | ❤️  │
├─────────────────────────────────────┤
│         [프롬프트 메시지 버블]      │
├─────────────────────────────────────┤
│ AI 모델 답변                        │
│ [Markdown 렌더링된 답변]            │
│                               [복사] │
└─────────────────────────────────────┘
```

### 3. HomePage 업데이트

**파일:** `frontend/app/components/HomePage.tsx`

#### 변경사항
- 공유 시 **모델 정보도 함께 저장**
- `modelId`와 `modelName`을 `postsApi.createPost()`에 전달

```typescript
await postsApi.createPost(
  currentMessage.prompt,
  currentMessage.response,
  userId,
  currentMessage.modelId,
  currentMessage.modelName || 'AI Model'
);
```

### 4. API 업데이트

**파일:** `frontend/lib/api.ts`

#### 추가된 필드
```typescript
interface LocalPost {
  id: string;
  prompt: string;
  response: string;
  userId?: string;
  userName?: string;
  modelId?: string;      // ✨ 추가
  modelName?: string;    // ✨ 추가
  createdAt: string;
  likes: number;
}
```

#### 새로운 API 함수
```typescript
// 단일 포스트 조회
postsApi.getPost(postId: string)
```

#### 샘플 데이터 업데이트
- GPT-4, Claude 3 Opus, GPT-3.5 Turbo 등 모델 정보 추가

### 5. 라우팅 & 네비게이션

**파일:** `frontend/app/page.tsx`, `frontend/app/components/Sidebar.tsx`

#### 페이지 구조
```
Home (프롬프트 입력 & 답변)
  ↓ 공유
Dashboard (프롬프트 카드 목록)
  ↓ 카드 클릭
Conversation (프롬프트 + 답변 + 모델 상세)
  ↓ 뒤로가기
Dashboard
```

#### State 관리
```typescript
const [currentPage, setCurrentPage] = useState<Page>('home');
const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

// 카드 클릭 시
const handleSelectPost = (postId: string) => {
  setSelectedPostId(postId);
  setCurrentPage('conversation');
};

// 뒤로가기 시
const handleBackToDashboard = () => {
  setCurrentPage('dashboard');
  setSelectedPostId(null);
};
```

## 🎨 UI/UX 개선사항

### DashboardPage
- **그리드 레이아웃**: 반응형 3열 그리드 (모바일: 1열, 태블릿: 2열, 데스크톱: 3열)
- **카드 호버 효과**: 그림자 증가, 텍스트 색상 변경
- **프롬프트 미리보기**: 3줄 제한으로 깔끔한 카드 크기 유지
- **모델 배지**: MessageSquare 아이콘과 함께 표시
- **좋아요 버튼**: 이벤트 전파 방지 (stopPropagation)

### ConversationPage
- **헤더 카드**: 사용자 정보 + 모델 정보 + 좋아요를 한 줄에 표시
- **프롬프트 버블**: 오른쪽 정렬, 파란색 배경
- **답변 카드**: Markdown 지원, 복사 버튼
- **뒤로가기 버튼**: 좌측 상단에 명확하게 표시

## 📦 수정/추가된 파일

### 새로 생성된 파일
- ✅ `frontend/app/components/DashboardPage.tsx` - 대시보드 페이지
- ✅ `frontend/app/components/ConversationPage.tsx` - 대화 상세 페이지

### 수정된 파일
- ✅ `frontend/app/components/HomePage.tsx` - 모델 정보 공유 추가
- ✅ `frontend/app/components/Sidebar.tsx` - Battle → Dashboard 변경
- ✅ `frontend/app/page.tsx` - 라우팅 로직 추가
- ✅ `frontend/lib/api.ts` - 모델 정보 필드 & getPost() 추가

### 삭제된 파일
- ❌ `frontend/app/components/BattlePage.tsx` - DashboardPage로 대체

## 🔧 사용 방법

### 1. 프롬프트 공유하기
1. Home 탭에서 질문 입력 → AI 답변 받기
2. 공유 버튼 클릭 → Dashboard에 포스트 생성
3. Toast 알림 확인

### 2. Dashboard에서 프롬프트 탐색
1. Sidebar에서 "Dashboard" 클릭
2. 카드 형식으로 표시된 프롬프트 목록 확인
3. 프롬프트 미리보기, 모델 정보, 좋아요 수 확인
4. 좋아요 버튼으로 반응하기

### 3. 대화 상세 보기
1. Dashboard에서 관심 있는 프롬프트 카드 클릭
2. Conversation 페이지로 이동
3. 전체 프롬프트, AI 답변, 사용된 모델 확인
4. 답변 복사 또는 좋아요
5. "돌아가기" 버튼으로 Dashboard 복귀

## 🎯 데이터 흐름

```
┌──────────────────────────────────────┐
│ HomePage                             │
│ - 프롬프트 입력                      │
│ - AI 답변 받기                       │
│ - 공유 버튼 클릭                     │
│   → postsApi.createPost()            │
│     (prompt, response, modelId, ...)  │
└──────────────────────────────────────┘
                ↓
┌──────────────────────────────────────┐
│ LocalStorage / Backend               │
│ - 포스트 저장 (모델 정보 포함)      │
└──────────────────────────────────────┘
                ↓
┌──────────────────────────────────────┐
│ DashboardPage                        │
│ - postsApi.getPosts()                │
│ - 카드 목록 표시                     │
│ - 카드 클릭 → onSelectPost(postId)   │
└──────────────────────────────────────┘
                ↓
┌──────────────────────────────────────┐
│ ConversationPage                     │
│ - postsApi.getPost(postId)           │
│ - 프롬프트 + 답변 + 모델 표시       │
│ - 뒤로가기 → onBack()                │
└──────────────────────────────────────┘
```

## 🔄 백엔드 연동

현재는 로컬 스토리지를 사용하지만, 백엔드가 준비되면 자동으로 API를 사용합니다.

### 필요한 백엔드 엔드포인트

```typescript
// POST /posts - 포스트 생성
{
  prompt: string;
  response: string;
  userId?: string;
  modelId?: string;    // ✨ 추가
  modelName?: string;  // ✨ 추가
}

// GET /posts?limit=20&offset=0 - 포스트 목록
[{
  id: string;
  prompt: string;
  response: string;
  userId?: string;
  userName?: string;
  modelId?: string;    // ✨ 추가
  modelName?: string;  // ✨ 추가
  createdAt: string;
  likes: number;
}]

// GET /posts/:postId - 단일 포스트 조회 ✨ 새로 추가
{
  id: string;
  prompt: string;
  response: string;
  userId?: string;
  userName?: string;
  modelId?: string;
  modelName?: string;
  createdAt: string;
  likes: number;
}

// POST /posts/:postId/like - 좋아요
{
  userId?: string;
}
```

## 💡 향후 개선 가능 사항

1. **필터링 & 정렬**
   - 모델별 필터링 (GPT-4, Claude 등)
   - 인기순, 최신순 정렬
   - 검색 기능

2. **상세 페이지 기능 추가**
   - 관련 프롬프트 추천
   - 댓글 기능
   - 모델 성능 비교

3. **대시보드 통계**
   - 인기 프롬프트 TOP 10
   - 모델별 사용 통계
   - 주간/월간 트렌드

4. **사용자 경험**
   - 무한 스크롤
   - 스켈레톤 로딩
   - 이미지/파일 첨부 지원

## ✅ 테스트 체크리스트

- [x] 프롬프트 공유 시 모델 정보 저장
- [x] Dashboard에서 프롬프트 카드 목록 표시
- [x] 모델 정보 배지 표시
- [x] 카드 클릭 시 Conversation 페이지 이동
- [x] Conversation 페이지에서 모든 정보 표시
- [x] 뒤로가기 버튼으로 Dashboard 복귀
- [x] 좋아요 기능 동작 (카드 & 상세 페이지)
- [x] Markdown 렌더링
- [x] 복사 기능
- [x] Toast 알림
- [x] 로컬 스토리지 저장/로드
- [x] 샘플 데이터에 모델 정보 포함

## 📱 반응형 디자인

### Mobile (< 768px)
- 1열 그리드
- 전체 너비 카드
- 햄버거 메뉴

### Tablet (768px - 1024px)
- 2열 그리드
- 적절한 카드 크기

### Desktop (> 1024px)
- 3열 그리드
- 고정 사이드바

---

**작성일**: 2025-11-22
**작성자**: AI Assistant
**버전**: 2.0

