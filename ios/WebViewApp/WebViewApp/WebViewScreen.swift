//
//  WebViewScreen.swift
//  WebViewApp
//
//  Created by Airen Kang on 11/11/25.
//

import SwiftUI
import WebKit

// MARK: - WebView Configuration
/**
 WebView 설정

 - Important: 아래 파라미터들은 Sendbird AI Agent를 사용하기 위해 필요합니다.
 */
struct WebViewConfig {
    static let baseURL = "http://localhost:5173"

    // MARK: 필수 파라미터

    /// Sendbird Application ID
    /// - Note: 센드버드 대시보드에서 확인 가능
    static let appId = "YOUR_APP_ID"

    /// Sendbird AI Agent ID
    /// - Note: 센드버드 대시보드에서 확인 가능
    static let aiAgentId = "YOUR_AI_AGENT_ID"

    /// Sendbird User ID — 앱에 생성한 사용자 아이디로 교체
    /// - Note: 생성한 센드버드 유저의 아이디
    /// - SeeAlso: [유저 생성 API](https://sendbird.com/docs/chat/platform-api/v3/user/creating-users/create-a-user)
    static let userId = "YOUR_USER_ID"

    /// User Authentication Token — 위 사용자에 대해 발급한 세션 토큰으로 교체
    /// - Note: 유저에 대해 발급받은 세션 토큰. 세션 핸들러를 통한 인증 갱신 시에도 동일한 절차로 발급 필요.
    /// - SeeAlso: [세션 토큰 발급 API](https://sendbird.com/docs/chat/platform-api/v3/user/managing-session-tokens/issue-a-session-token#1-issue-a-session-token)
    static let authToken = "YOUR_AUTH_TOKEN"

    // MARK: 옵션 파라미터

    /// 활성 대화 존재 여부
    /// - Note: `false`일 경우 Conversation 화면으로, `true`일 경우 ConversationList 화면으로 진입
    static let hasActiveConversation = false

    /// Initial Context Object
    /// - Note: 웹뷰에 전달할 초기 컨텍스트 정보. URL 파라미터로 `context_{key}` 형태로 전달되며,
    ///         웹에서 대화가 생성될 때 AI 에이전트의 context object로 주입됩니다.
    /// - Important: `userId`, `timezone`은 **필수**로 전달해 주세요.
    ///              `language`, `country`는 선택 항목입니다.
    static let initialContextObject: [String: String] = [
        // 필수 항목
        "userId": userId,                                       // 사용자 식별자
        "timezone": TimeZone.current.identifier,                // IANA 타임존 (예: "Asia/Seoul")
        // 선택 항목
        "language": Locale.preferredLanguages.first ?? "ko-KR", // BCP-47 (예: "ko-KR")
        "country": Locale.current.region?.identifier ?? "KR",   // ISO 3166-1 alpha-2 (예: "KR")
        "appVersion": "1.0.0",
        "platform": "ios"
    ]

    static func buildURL(route: String, initialChannelUrl: String? = nil, isGuest: Bool = false) -> String {
        let urlWithRoute = "\(baseURL)/\(route)"
        var components = URLComponents(string: urlWithRoute)!
        var queryItems = [
            URLQueryItem(name: "appId", value: appId),
            URLQueryItem(name: "aiAgentId", value: aiAgentId),
            URLQueryItem(name: "hasActiveConversation", value: String(hasActiveConversation))
        ]

        // 비회원(게스트) 상담이면 userId/authToken을 전달하지 않음 → 웹 SDK가 익명 세션으로 시작
        // (익명 유저 발급과 토큰 갱신은 SDK가 내부 처리하므로 session_token 브릿지가 호출되지 않음)
        if !isGuest {
            queryItems.append(URLQueryItem(name: "userId", value: userId))
            queryItems.append(URLQueryItem(name: "authToken", value: authToken))
        }

        // initialContextObject를 context_ prefix로 URL params에 추가
        for (key, value) in initialContextObject {
            queryItems.append(URLQueryItem(name: "context_\(key)", value: value))
        }

        if let initialChannelUrl = initialChannelUrl {
            queryItems.append(URLQueryItem(name: "initialChannelUrl", value: initialChannelUrl))
        }

        components.queryItems = queryItems
        return components.url?.absoluteString ?? urlWithRoute
    }
}

struct WebViewScreen: View {
    let route: String
    let initialChannelUrl: String?
    let isGuest: Bool
    @Environment(\.dismiss) private var dismiss

    init(route: String = "simple", initialChannelUrl: String? = nil, isGuest: Bool = false) {
        self.route = route
        self.initialChannelUrl = initialChannelUrl
        self.isGuest = isGuest
    }

    var body: some View {
        WebView(urlString: WebViewConfig.buildURL(route: route, initialChannelUrl: initialChannelUrl, isGuest: isGuest), onDismiss: {
            dismiss()
        })
        .ignoresSafeArea()
        .navigationBarHidden(true)
    }
}

struct WebView: UIViewRepresentable {
    let urlString: String
    let onDismiss: () -> Void

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        let userContentController = WKUserContentController()

        // Bridge 메시지 핸들러 등록
        userContentController.add(context.coordinator, name: "native")
        configuration.userContentController = userContentController

        // localStorage, IndexedDB 영속성 보장
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView

        // 줌, 바운스 비활성화
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0

        // 초기 로드
        if let url = URL(string: urlString) {
            webView.load(URLRequest(url: url))
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // 비워둠 - modal이나 background 전환 시 재로드 방지
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onDismiss: onDismiss)
    }

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?
        let onDismiss: () -> Void

        init(onDismiss: @escaping () -> Void) {
            self.onDismiss = onDismiss
        }

        // MARK: - WKNavigationDelegate

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("[Bridge] 웹 페이지 로드 완료")
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            print("[Bridge] 웹 페이지 로드 실패: \(error.localizedDescription)")
        }

        // MARK: - WKScriptMessageHandler

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any],
                  let event = body["event"] as? String else {
                print("[Bridge] Invalid message format")
                return
            }

            let data = body["data"]
            let requestId = body["requestId"] as? String

            print("[Bridge] Received event: \(event), data: \(String(describing: data))")

            // 이벤트 처리
            handleEvent(event: event, data: data, requestId: requestId)
        }

        private func handleEvent(event: String, data: Any?, requestId: String?) {
            switch event {
            case "quit":
                // 뒤로 가기
                DispatchQueue.main.async {
                    self.onDismiss()
                }

            case "session_token":
                // 세션 토큰 반환 (더미)
                guard let requestId = requestId, let webView = webView else { return }
                let token = "dummy_session_token_ios_\(UUID().uuidString)"
                let responseEvent = "__response_\(requestId)"
                // String을 JSON string으로 전송
                let jsonData = "\"\(token)\""
                let script = "window.__bridgeReceive('\(responseEvent)', \(jsonData));"
                webView.evaluateJavaScript(script) { result, error in
                    if let error = error {
                        print("[Bridge] Error sending session token: \(error)")
                    } else {
                        print("[Bridge] Session token sent: \(token)")
                    }
                }

            case "session_error":
                // 세션 에러 처리
                DispatchQueue.main.async {
                    // Alert 표시 후 화면 종료
                    // TODO: UIAlertController로 에러 메시지 표시
                    self.onDismiss()
                }

            default:
                print("[Bridge] Unhandled event: \(event)")
            }
        }

        // 웹으로 응답 전송 (양방향 통신)
        private func sendResponse(requestId: String?, data: Any?) {
            guard let requestId = requestId else { return }

            let responseEvent = "__response_\(requestId)"
            sendToWeb(event: responseEvent, data: data)
        }

        // 웹으로 이벤트 전송
        private func sendToWeb(event: String, data: Any?) {
            guard let webView = webView else { return }

            let jsonData: String
            if let data = data,
               let jsonDataObj = try? JSONSerialization.data(withJSONObject: data),
               let jsonString = String(data: jsonDataObj, encoding: .utf8) {
                jsonData = jsonString
            } else {
                jsonData = "null"
            }

            let script = "window.__bridgeReceive('\(event)', \(jsonData));"
            webView.evaluateJavaScript(script) { result, error in
                if let error = error {
                    print("[Bridge] Error sending to web: \(error)")
                }
            }
        }

        // Context 업데이트를 웹으로 전송 (Example)
        func patchContextExample(orderId: String) {
            let contextData: [String: Any] = ["orderId": orderId]
            sendToWeb(event: "patch_context", data: contextData)
        }

        // Push Token을 웹으로 전송 (Example)
        func sendPushToken(token: String) {
            let data: [String: Any] = ["token": token]
            sendToWeb(event: "push_token", data: data)
        }
    }
}

#Preview {
    WebViewScreen()
}
