# 세션 토큰 갱신 실패 가이드

## 세션 핸들러 정보

| 콜백 | 호출 시점 | 설명 |
|------|----------|------|
| `onSessionTokenRequired` | 토큰 만료 시 | 새로운 토큰을 요청받음. `resolve()` 또는 `reject()` 호출 필요 |
| `onSessionError` | 토큰 갱신 실패 시 | `reject()` 호출 시 트리거됨. |
| `onSessionClosed` | 세션 종료 시 | `deauthenticate()` 호출 시 트리거됨 |

## 개요

Sendbird 세션 토큰이 만료되면 `onSessionTokenRequired` 를 통해서 새로운 토큰을 요청합니다.

이때 토큰 발급 과정에서 실패하여 `reject(error)`를 호출하게 되면 다음과 같은 상황이 발생합니다.


## 발생하는 현상

### 1. 메시지 전송
- 사용자가 보낸 메시지가 전송되지 않고 **대기 상태(pending)**로 남습니다
- 추후 세션이 정상적으로 재연결되면 대기 중이던 메시지가 자동으로 전송됩니다

### 2. 대화 목록 및 기타 API
- 대화 목록 불러오기 등 Sendbird API 호출이 실패합니다.
- 화면이 비어있는 상태로 보이거나 데이터가 업데이트되지 않을 수 있습니다.

## 복구

만약 네트워크 상태 등으로 인한 간헐적 에러인 경우, 세션 에러 발생 시 다음 단계로 재시도를 할 수 있습니다:

### Step 1: 새로운 세션 토큰 준비
Sendbird API를 통해 새로운 세션 토큰을 발급받습니다.

### Step 2: 토큰 업데이트
`userSessionInfo` props 로 전달되는 `ManualSessionInfo` 객체의 `authToken`을 새로운 토큰으로 업데이트합니다.

### Step 3: 재인증 요청
업데이트 이후, `authenticate()` 메서드를 호출하여 재인증을 시도합니다.

```ts
new ManualSessionInfo({
  userId,
  authToken: token,
  sessionHandler: {
    async onSessionError(error) {
      if (error instanceof Error && error.message === "Network error") {
        const newAuthToken = await fetchAuthToken(userId);
        setToken(newAuthToken);
        messengerRef.current?.authenticate(); // 혹은 useMessengerSessionContext 훅의 authenticate() 호출
      } else {
        bridge.send('session_error');
      }
    },
    async onSessionTokenRequired(resolve, reject) {
      try {
        const authToken = await fetchAuthToken(userId);
        resolve(authToken);
      } catch (e) {
        reject(e);
      }
    },
  },
})
```
