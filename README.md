# Sendbird AI Agent Messenger React - WebView 통합 샘플

이 프로젝트는 `@sendbird/ai-agent-messenger-react` 라이브러리를 사용하여 AI 에이전트 챗봇을 구현하고, Android 및 iOS 네이티브 앱의 WebView에서 실행하는 샘플입니다.

## 프로젝트 구조

```
woowa-sample/
├── web/          # Vite + React + TypeScript (Sendbird AI Agent Messenger)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SimpleChatPage.tsx       # FixedMessenger 사용 예제
│   │   │   └── CustomMessengerPage.tsx  # AgentProviderContainer 커스텀 예제
│   │   ├── utils/
│   │   │   └── config.ts                # URL 파라미터 파싱 및 세션 정보 생성
│   │   ├── libs/
│   │   │   ├── bridge.ts                # 네이티브-웹 브릿지 구현
│   │   │   └── strings.ts               # 커스텀 문자열 정의 (다국어화)
│   │   └── App.tsx                      # 라우팅 설정
├── android/      # Android Native 앱 (WebView)
└── ios/          # iOS Native 앱 (WKWebView)
```


## 실행 방법

### Web 앱

```bash
cd web
npm install
npm run dev
```

개발 서버가 `http://localhost:5173`에서 실행됩니다.

**라우트:**
- `/simple`: SimpleChatPage (FixedMessenger 사용)
- `/custom`: CustomMessengerPage (커스텀 통합)

### Android 앱

Android Studio로 `android/` 폴더를 열고 실행하면 localhost 웹뷰로 연결됩니다.

### iOS 앱

Xcode로 `ios/WebViewApp/WebViewApp.xcodeproj`를 열고 실행하면 localhost 웹뷰로 연결됩니다.


## Sendbird AI Agent Messenger React 소개

### 핵심 컴포넌트

#### 1. FixedMessenger (간편한 통합)

`SimpleChatPage.tsx`에서 사용하는 올인원 컴포넌트로, 최소한의 설정만으로 AI 에이전트 메신저를 구현할 수 있습니다.

**주요 Props:**
- `appId`: Sendbird 앱 ID
- `aiAgentId`: AI 에이전트 ID
- `userSessionInfo`: 사용자 세션 정보 (ManualSessionInfo)
- `entryPoint`: 초기 화면 (`'Conversation'` | `'ConversationList'`)
- `queryParams`: 대화 목록 필터링 옵션
- `state`: 메신저 열림/닫힘 상태 관리
- `stringSet`: 커스텀 문자열 (다국어화)

**사용 예시:**
```tsx
<FixedMessenger
  appId={params.appId}
  aiAgentId={params.aiAgentId}
  userSessionInfo={sessionInfo}
  entryPoint={params.hasActiveConversation ? 'ConversationList' : 'Conversation'}
  state={{
    opened: true,
    setOpened: () => bridge.send('quit'),
  }}
  stringSet={customStringSet}
/>
```

#### 2. AgentProviderContainer + Conversation/ConversationList (커스텀 통합)

`CustomMessengerPage.tsx`에서 사용하는 방식으로, 더 세밀한 제어와 커스터마이징이 필요할 때 사용합니다.

**AgentProviderContainer:**
- Sendbird SDK 초기화 및 컨텍스트 제공
- 하위 컴포넌트에서 `useMessengerContext()`, `useMessengerSessionContext()` 훅 사용 가능

**Conversation:**
- 개별 대화 화면
- Props: `channelUrl`, `onNavigateToConversationList`, `shouldMarkAsRead`

**ConversationList:**
- 대화 목록 화면
- Props: `onOpenConversationView`

**사용 예시:**
```tsx
<AgentProviderContainer
  appId={params.appId}
  aiAgentId={params.aiAgentId}
  userSessionInfo={sessionInfo}
  stringSet={customStringSet}
>
  {currentScreen === 'conversation' ? (
    <Conversation
      channelUrl={selectedChannelUrl}
      onNavigateToConversationList={() => setCurrentScreen('conversationList')}
    />
  ) : (
    <ConversationList
      onOpenConversationView={(url) => {
        setSelectedChannelUrl(url);
        setCurrentScreen('conversation');
      }}
    />
  )}
</AgentProviderContainer>
```

### 세션 관리

`ManualSessionInfo`를 사용하여 사용자 인증 및 세션 토큰 갱신을 처리합니다.

```ts
const sessionInfo = new ManualSessionInfo({
  userId: 'user-id',
  authToken: 'auth-token',
  sessionHandler: {
    async onSessionTokenRequired(resolve, reject) {
      // 토큰 만료 시 자동으로 호출되어 새 토큰을 요청
      const newToken = await bridge.request<string>('session_token');
      resolve(newToken);
    },
  },
});
```

### 커스터마이징

#### 1. 문자열 커스터마이징 (다국어화)

`libs/strings.ts`에서 모든 UI 텍스트를 커스터마이징할 수 있습니다.

```ts
export const customStringSet: AIAgentProps['stringSet'] = {
  MESSAGE_INPUT__PLACE_HOLDER: 'Ask a question',
  CONVERSATION_LIST__HEADER_TITLE: 'Conversations',
  // ... 더 많은 문자열
};
```

#### 2. 대화 필터링

```ts
queryParams={{
  conversationListParams: {
    filter: {
      aiAgentConversationStatusFilter: [ConversationStatus.OPEN],
    },
  },
}}
```

## WebView Bridge

네이티브 앱과 웹 앱 간의 양방향 통신을 지원하는 브릿지입니다.

### 주요 기능

1. **단방향 통신 (send)**: 웹 → 네이티브로 이벤트 전송
2. **양방향 통신 (request)**: 웹 → 네이티브로 요청 후 응답 대기
3. **이벤트 수신 (on)**: 네이티브 → 웹으로 이벤트 수신

### 사용 예시

```ts
// 단방향: 네이티브에 quit 이벤트 전송
bridge.send('quit');

// 양방향: 네이티브에 세션 토큰 요청
const token = await bridge.request<string>('session_token');

// 이벤트 수신: 네이티브로부터 이벤트 받기
const unsubscribe = bridge.on('some_event', (data) => {
  console.log('Received:', data);
});
```

## URL 파라미터

앱 실행 시 다음 URL 파라미터를 전달해야 합니다:

| 파라미터 | 필수 | 설명 | 참고 |
|---------|------|------|------|
| `appId` | ✓ | Sendbird Application ID | [Dashboard](https://dashboard.sendbird.com)에서 확인 |
| `aiAgentId` | ✓ | Sendbird AI Agent ID | [Dashboard](https://dashboard.sendbird.com)에서 확인 |
| `userId` | ✓ | Sendbird User ID | [유저 생성 API](https://sendbird.com/docs/chat/platform-api/v3/user/creating-users/create-a-user)로 생성 |
| `authToken` | ✓ | 세션 토큰 | [토큰 발급 API](https://sendbird.com/docs/chat/platform-api/v3/user/managing-session-tokens/issue-a-session-token)로 발급. 토큰 갱신 시에도 동일한 절차 필요 |
| `hasActiveConversation` | | 진행 중인 대화 존재 여부 (`true`/`false`) | `true`면 대화 목록 화면, `false`면 새 대화 화면 |
| `initialChannelUrl` | | 특정 채널로 직접 이동 | `hasActiveConversation=true`일 때 유효 |

**예시:**
```
http://localhost:5173/simple?appId=YOUR_APP_ID&aiAgentId=YOUR_AI_AGENT_ID&userId=YOUR_USER_ID&authToken=YOUR_AUTH_TOKEN&hasActiveConversation=true
```
