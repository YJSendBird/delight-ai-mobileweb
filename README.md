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
http://localhost:5173/simple?appId=YOUR_APP_ID&aiAgentId=YOUR_AI_AGENT_ID&userId=YOUR_USER_ID&authToken=YOUR_AUTH_TOKEN&hasActiveConversation=true&context_userId=YOUR_USER_ID&context_timezone=Asia%2FSeoul&context_language=ko-KR&context_country=KR
```

### Context Object 파라미터 (`context_*`)

`context_` prefix가 붙은 URL 파라미터는 모두 초기 컨텍스트 객체(initialContextObject)로 변환되어,
**대화가 생성될 때 AI 에이전트의 context object로 주입**됩니다. 에이전트가 사용자 식별·시간대 계산·언어 응대에
활용하므로 아래 항목을 함께 전달하는 것을 권장합니다.

| 파라미터 | 필수 | 설명 | 예시 |
|---------|------|------|------|
| `context_userId` | ✓ | 사용자 식별자 (인증에 사용한 `userId`와 동일 값 권장) | `aiagent-test-user` |
| `context_timezone` | ✓ | 사용자 기기의 IANA 타임존 | `Asia/Seoul` |
| `context_language` | | 사용자 언어 (BCP-47) | `ko-KR` |
| `context_country` | | 사용자 국가 (ISO 3166-1 alpha-2) | `KR` |

- 네이티브 앱에서의 설정 위치: iOS `WebViewScreen.swift`의 `initialContextObject`, Android `WebViewActivity.kt`의 `INITIAL_CONTEXT_OBJECT`
  (기기 설정에서 timezone/language/country를 동적으로 읽어 전달하는 예시 포함)
- 대화가 생성된 **이후** context를 추가/변경하려면 `patch_context` 브릿지를 사용합니다. (`WEBVIEW_BRIDGE.md` 참고)

#### 웹 코드에서의 주입 흐름 (예제)

**1) URL 파라미터 파싱** — `web/src/utils/config.ts`
`context_` prefix가 붙은 파라미터를 모두 모아 `initialContextObject`로 변환합니다.

```typescript
// web/src/utils/config.ts — parseAppParams()
const urlParams = new URLSearchParams(window.location.search);

// context_ prefix로 시작하는 모든 URL params를 initialContextObject로 변환
// 예: context_userId=user-123 → { userId: 'user-123' }
const initialContextObject: Record<string, string> = {};
for (const [key, value] of urlParams.entries()) {
  if (key.startsWith('context_')) {
    initialContextObject[key.replace('context_', '')] = value;
  }
}
```

**2) 메신저에 context 전달** — `web/src/pages/SimpleChatPage.tsx`
파싱한 객체를 `FixedMessenger`의 `context` prop으로 넘기면, **새 대화가 생성되는 시점에
AI 에이전트의 context object로 주입**됩니다.

```tsx
// web/src/pages/SimpleChatPage.tsx
const params = parseAppParams();
const [context] = useState<Record<string, string>>(params?.initialContextObject || {});

<FixedMessenger
  appId={params.appId}
  aiAgentId={params.aiAgentId}
  userSessionInfo={...}
  context={context}   // ← 대화 생성 시 이 객체가 에이전트 context로 주입됨
>
```

**3) 대화 생성 이후 context 업데이트** — `patch_context` 브릿지
이미 생성된 대화에 context를 추가/변경하려면, 네이티브 앱이 브릿지로 보낸 `patch_context`
이벤트를 받아 `messengerRef.patchContext()`를 호출합니다.

```tsx
// web/src/pages/SimpleChatPage.tsx — useContextObject()
const messengerRef = useRef<MessengerSessionRef>(null);

useEffect(() => {
  const destructor = bridge.on('patch_context', (data: Record<string, string>) => {
    // 활성 대화가 있을 때: 진행 중인 대화의 context를 즉시 패치
    messengerRef.current?.patchContext(data);

    // (선택) 다음에 생성될 대화에도 반영하려면 context 상태를 함께 갱신
    // setContext((prev) => ({ ...prev, ...data }));
  });
  return () => destructor();
}, []);
```

> 커스텀 통합(`CustomMessengerPage.tsx`)에서는 `channel.patchContext(aiAgentId, data)`로
> 현재 채널에 직접 패치하는 방식을 사용합니다.
