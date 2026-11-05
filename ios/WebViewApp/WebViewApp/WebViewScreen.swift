//
//  WebViewScreen.swift
//  WebViewApp
//
//  Created by Airen Kang on 11/11/25.
//

import SwiftUI
import WebKit
import SafariServices

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

    /// Sendbird User ID — 위 앱에 생성한 사용자 아이디로 교체하세요.
    /// - Important: 세션 토큰은 **앱에 종속**됩니다. 사용하는 앱 기준으로 발급해야 합니다.
    /// - SeeAlso: [유저 생성 API](https://sendbird.com/docs/chat/platform-api/v3/user/creating-users/create-a-user)
    static let userId = "YOUR_USER_ID"

    /// User Authentication Token — 위 사용자에 대해 발급한 세션 토큰으로 교체하세요.
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

    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, WKDownloadDelegate {
        weak var webView: WKWebView?
        let onDismiss: () -> Void
        /// 다운로드 중인 파일의 저장 위치 (완료 시 공유 시트로 전달)
        private var downloadedFileURL: URL?

        init(onDismiss: @escaping () -> Void) {
            self.onDismiss = onDismiss
        }

        // MARK: - WKNavigationDelegate

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            print("[Bridge] 웹 페이지 로드 완료")

            // 푸시 토큰 전달 — 웹의 PushTokenRegister가 수신해 Sendbird에 등록합니다.
            // 이미 받아둔 토큰이 있으면 즉시 전달하고, 아직이면 수신 시점에 전달되도록 등록해 둡니다.
            if let token = PushManager.shared.deviceToken {
                sendPushToken(token: token)
            }
            PushManager.shared.onTokenReady = { [weak self] token in
                DispatchQueue.main.async { self?.sendPushToken(token: token) }
            }
        }

        // MARK: - 파일 다운로드
        //
        // SDK 이미지 뷰어의 다운로드 버튼은 `<a href={fileUrl} download>` 앵커입니다.
        // `download` 속성은 **동일 오리진에서만** 동작하는데 파일 URL 은 샌드버드 CDN(다른 오리진)
        // 이라 무시되고, 서버가 첨부로 내려주면 WKWebView 는 표시할 수 없어
        // **아무 일도 일어나지 않습니다.** 아래 두 메서드로 다운로드로 전환해야 동작합니다.

        /// 표시할 수 없는 응답(첨부 파일 등)은 다운로드로 전환합니다.
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationResponse: WKNavigationResponse,
            decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void
        ) {
            if navigationResponse.canShowMIMEType {
                decisionHandler(.allow)
            } else {
                decisionHandler(.download)
            }
        }

        func webView(
            _ webView: WKWebView,
            navigationResponse: WKNavigationResponse,
            didBecome download: WKDownload
        ) {
            download.delegate = self
        }

        // MARK: WKDownloadDelegate

        /// 임시 폴더에 저장합니다. 같은 이름이 있으면 지우고 새로 받습니다.
        func download(
            _ download: WKDownload,
            decideDestinationUsing response: URLResponse,
            suggestedFilename: String,
            completionHandler: @escaping (URL?) -> Void
        ) {
            let dir = FileManager.default.temporaryDirectory.appendingPathComponent("downloads", isDirectory: true)
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let dest = dir.appendingPathComponent(suggestedFilename.isEmpty ? "file" : suggestedFilename)
            try? FileManager.default.removeItem(at: dest)
            downloadedFileURL = dest
            completionHandler(dest)
        }

        /// 완료되면 공유 시트를 띄워 사용자가 '사진에 저장' / '파일에 저장' 을 고르게 합니다.
        func downloadDidFinish(_ download: WKDownload) {
            guard let url = downloadedFileURL else { return }
            downloadedFileURL = nil
            DispatchQueue.main.async { [weak self] in
                guard let top = Self.topViewController() else { return }
                let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                // iPad 에서는 popover 앵커가 없으면 크래시합니다.
                sheet.popoverPresentationController?.sourceView = top.view
                sheet.popoverPresentationController?.sourceRect = CGRect(
                    x: top.view.bounds.midX, y: top.view.bounds.midY, width: 0, height: 0
                )
                top.present(sheet, animated: true)
                _ = self
            }
        }

        func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
            downloadedFileURL = nil
            print("[Bridge] download 실패: \(error.localizedDescription)")
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

            case "navigate_internal":
                // 자사 서비스 링크 → 앱 내비게이션으로 이동.
                // 뒤로가기 한 번으로 메신저로 복귀하며 대화 상태도 유지됩니다.
                guard let payload = data as? [String: Any],
                      let urlString = payload["url"] as? String,
                      let url = URL(string: urlString),
                      let scheme = url.scheme?.lowercased(),
                      scheme == "http" || scheme == "https" else {
                    print("[Bridge] navigate_internal: 유효하지 않은 URL")
                    return
                }
                DispatchQueue.main.async { self.pushInternalPage(url) }

            case "open_external":
                // 메신저 안의 링크·첨부파일(PDF 등) 열기 요청.
                // 웹에서 window.open 이 호출되기 전에 가로챈 것이므로,
                // 이 이벤트로 도착했다면 출처가 챗봇임이 보장됩니다.
                guard let payload = data as? [String: Any],
                      let urlString = payload["url"] as? String,
                      let url = URL(string: urlString),
                      let scheme = url.scheme?.lowercased(),
                      scheme == "http" || scheme == "https" else {
                    print("[Bridge] open_external: 유효하지 않은 URL")
                    return
                }
                DispatchQueue.main.async { self.presentExternalViewer(url) }

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

        /// 자사 서비스 링크를 앱 안에서 열기
        ///
        /// `UINavigationController` 로 감싸 **뒤로/닫기 버튼을 제공**합니다.
        /// 메신저가 떠 있는 WebView 를 그대로 두고 그 위에 새 화면을 올리므로,
        /// 닫으면 대화 내용과 스크롤 위치가 그대로 유지됩니다.
        ///
        /// - Note: 같은 WebView 에 `load(_:)` 로 이동시켜도 히스토리는 남지만,
        ///   돌아올 때 메신저가 리로드되어 대화가 초기화됩니다.
        private func pushInternalPage(_ url: URL) {
            guard let top = Self.topViewController() else { return }
            let viewer = InternalWebViewController(url: url)
            let nav = UINavigationController(rootViewController: viewer)
            nav.modalPresentationStyle = .fullScreen
            top.present(nav, animated: true)
        }

        /// 현재 최상단에 떠 있는 화면을 찾습니다.
        static func topViewController() -> UIViewController? {
            guard let scene = UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene })
                    .first(where: { $0.activationState == .foregroundActive }),
                  let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
                return nil
            }
            var top = root
            while let presented = top.presentedViewController { top = presented }
            return top
        }

        /// 외부 뷰어로 URL 열기
        ///
        /// `SFSafariViewController` 는 **완료(닫기) 버튼과 공유 기능이 기본 제공**되고
        /// PDF 렌더링도 OS 가 담당하므로, 웹뷰에 직접 띄울 때 생기는
        /// "닫을 방법이 없다"는 문제가 발생하지 않습니다.
        ///
        /// 앱 밖(Safari 앱)으로 내보내고 싶다면 `UIApplication.shared.open(url)` 을 쓰면 됩니다.
        private func presentExternalViewer(_ url: URL) {
            guard let top = Self.topViewController() else {
                print("[Bridge] open_external: 표시할 화면을 찾지 못했습니다.")
                return
            }
            let viewer = SFSafariViewController(url: url)
            viewer.dismissButtonStyle = .close
            top.present(viewer, animated: true)
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
