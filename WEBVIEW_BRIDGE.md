# WebView Bridge Interface

샘플에서 네이티브 앱(Android/iOS)과 웹뷰(React) 간 통신을 위한 Bridge Interface를 정의합니다.

## 개요

샘플의 WebView Bridge는 양방향 통신을 지원합니다:
- **단방향 (send)**: 웹 → 앱으로 이벤트 전송 (응답 없음)
- **양방향 (request)**: 웹 → 앱으로 요청 전송 후 응답 대기
- **이벤트 수신 (on)**: 앱 → 웹으로 이벤트 수신

## 인터페이스

### **[웹 → 앱] Messenger UI 종료 요청**
사용자가 Messenger를 닫을 때 네이티브 앱에 알립니다.

#### 웹에서 호출

```typescript
// 샘플에서의 예제 코드
bridge.send('quit');
```

#### 네이티브에서 해야 할 일

1. `quit` 이벤트를 받음
2. WebView 화면을 닫는 처리를 진행 (dismiss/finish)

---

### **[웹 → 앱] 세션 에러 알림**
세션 토큰 갱신이 실패했을 때 네이티브 앱에 알립니다.

#### 웹에서 호출

```typescript
// 샘플에서의 예제 코드
onSessionError() {
  bridge.send('session_error');
}
```

#### 네이티브에서 해야 할 일

1. `session_error` 이벤트를 받음
2. 사용자에게 에러 알림 표시 (Toast, Alert 등)
3. 필요한 경우 화면 종료 또는 재시도 처리

---

### **[웹 → 앱] 세션 토큰 발급 요청**

> 웹에서 API 를 이용한 호출시에는 필요하지 않음

Sendbird 세션 토큰이 만료되었을 때 새로운 토큰을 요청합니다.

#### 웹에서 호출

```typescript
// 샘플에서의 예제 코드
const token = await bridge.request<string>('session_token');
```

#### 네이티브에서 해야 할 일

1. `session_token` 이벤트를 받음
2. Sendbird API로 새로운 세션 토큰 발급
3. 웹에 응답 전달

---

### **[앱 → 웹] Context Object 업데이트**

> 시나리오에 따라 상이할 수 있음

`context object` 는 AI와의 대화 도중에 활용 가능하도록 주입하는 데이터입니다.

대화 생성시에는 initialContextObject 를 통해서 전달이 가능하며, 만약 대화 도중에 context 정보를 업데이트 해야할 필요가 있을 경우에는
네이티브 앱에서 웹으로 컨텍스트 정보를 전달하여 업데이트 요청을 할 수 있습니다.

#### 네이티브에서 호출

**Android:**
```kotlin
// 예제: orderId를 웹으로 전달
val contextData = JSONObject().apply {
    put("orderId", "order-12345")
}
bridge.sendToWeb("patch_context", contextData)
```

**iOS:**
```swift
// 예제: orderId를 웹으로 전달
let contextData: [String: Any] = ["orderId": "order-12345"]
coordinator.sendToWeb(event: "patch_context", data: contextData)
```

#### 웹에서 수신

```ts
// 샘플에서의 예제 코드
useEffect(() => {
  const destructor = bridge.on('patch_context', (data: Record<string, string>) => {
    messengerRef.current?.patchContext(data);
    // or
    channel?.patchContext(aiAgentId, data);
  });

  return () => destructor();
}, []);
```

---

### **[앱 → 웹] Push Token 전송**

네이티브 앱에서 FCM/APNS Push Token을 받았을 때 웹으로 전달하여 Sendbird에 등록합니다.

#### 네이티브에서 호출

**Android:**
```kotlin
// FCM 토큰을 웹으로 전달
bridge.sendPushToken("fcm-token-string")
```

**iOS:**
```swift
// APNS 토큰을 웹으로 전달
coordinator.sendPushToken(token: "apns-token-string")
```

#### 웹에서 수신

```ts
// 샘플에서의 예제 코드
useEffect(() => {
  const destructor = bridge.on('push_token', (data: { token: string }) => {
    const token = data.token;
    const platform = bridge.getPlatform();
    const isConnected = !!sdkUser;

    if (token && isConnected) {
      if (platform === 'ios') {
        chatSDK.registerAPNSPushTokenForCurrentUser(token);
      } else if (platform === 'android') {
        chatSDK.registerFCMPushTokenForCurrentUser(token);
      }
    }
  });

  return () => destructor();
}, [chatSDK, sdkUser]);
```
