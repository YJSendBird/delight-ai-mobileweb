//
//  PushManager.swift
//  WebViewApp
//
//  웹뷰 구성에서의 푸시 수신 샘플.
//
//  [구조] 네이티브 앱에는 Sendbird SDK가 없으므로, APNs 토큰을 직접 등록하지 않고
//        브릿지(`push_token`)로 웹에 전달하면 웹의 SDK가 등록합니다.
//
//    APNs → AppDelegate(토큰 수신) → PushManager 보관
//         → 웹뷰 로드 완료 시 bridge.sendPushToken() → 웹의 PushTokenRegister
//         → chatSDK.registerAPNSPushTokenForCurrentUser(token)
//
//  [사전 준비]
//   1. Xcode > Signing & Capabilities > + Capability > Push Notifications 추가
//   2. Apple Developer 콘솔에서 APNs 인증서/키 발급 후 Sendbird 대시보드에 등록
//   3. 시뮬레이터는 APNs 토큰이 발급되지 않으므로 실기기에서 테스트
//

import UIKit
import UserNotifications

/// APNs 디바이스 토큰을 보관하고 웹뷰에 전달하는 역할을 담당합니다.
///
/// 토큰은 앱 시작 직후(웹뷰가 열리기 전) 도착하므로, 여기에 보관해 두었다가
/// 웹뷰 로드가 끝난 시점에 전달합니다. (전달 타이밍 경합 방지)
final class PushManager {
    static let shared = PushManager()
    private init() {}

    /// APNs에서 발급받은 디바이스 토큰 (hex 문자열)
    private(set) var deviceToken: String?

    /// 푸시 탭으로 진입한 경우의 페이로드. 웹뷰 진입 후 처리합니다.
    var pendingNotificationPayload: [AnyHashable: Any]?

    /// 웹뷰가 준비되면 호출되어 토큰을 전달합니다.
    var onTokenReady: ((String) -> Void)?

    func updateDeviceToken(_ token: String) {
        self.deviceToken = token
        onTokenReady?(token)
    }

    /// Sendbird가 보낸 푸시인지 확인합니다. (타 서비스 푸시와 구분)
    static func isSendbirdPush(_ userInfo: [AnyHashable: Any]) -> Bool {
        return userInfo["sendbird"] != nil
    }
}

/// 푸시 권한 요청 / APNs 등록 / 수신 처리를 담당하는 AppDelegate.
///
/// SwiftUI 앱에서는 `@UIApplicationDelegateAdaptor`로 연결합니다. (WebViewAppApp.swift 참고)
class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        registerForPushNotifications()
        return true
    }

    /// 알림 권한을 요청하고 APNs에 등록합니다.
    private func registerForPushNotifications() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("[Push] 권한 요청 실패: \(error.localizedDescription)")
                return
            }
            guard granted else {
                print("[Push] 사용자가 알림 권한을 거부했습니다")
                return
            }
            // APNs 등록은 메인 스레드에서 호출해야 합니다.
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    // MARK: - APNs 토큰 수신

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Data → hex 문자열로 변환 (웹 SDK가 요구하는 형식)
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        print("[Push] APNs 토큰 수신: \(token.prefix(12))…")
        PushManager.shared.updateDeviceToken(token)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        // 시뮬레이터에서는 토큰이 발급되지 않아 여기로 들어올 수 있습니다.
        print("[Push] APNs 등록 실패: \(error.localizedDescription)")
    }
}

// MARK: - 푸시 수신 / 탭 처리

extension AppDelegate: UNUserNotificationCenterDelegate {

    /// 앱이 포그라운드일 때 푸시가 도착한 경우의 표시 방식입니다.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // 상담 화면을 보고 있는 중에는 배너를 띄우지 않으려면 빈 배열을 전달하세요.
        completionHandler([.banner, .sound, .badge])
    }

    /// 사용자가 푸시를 탭했을 때 호출됩니다.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        // Sendbird 푸시가 아니면 앱의 기존 처리에 맡깁니다.
        guard PushManager.isSendbirdPush(userInfo) else {
            completionHandler()
            return
        }

        // 상담 화면으로 이동시키기 위해 페이로드를 보관합니다.
        // (ContentView 등에서 이 값을 확인해 상담 화면을 띄우도록 구현)
        PushManager.shared.pendingNotificationPayload = userInfo
        NotificationCenter.default.post(name: .didTapSendbirdPush, object: nil)

        completionHandler()
    }
}

extension Notification.Name {
    /// Sendbird 푸시를 탭했을 때 발송되는 앱 내부 알림
    static let didTapSendbirdPush = Notification.Name("didTapSendbirdPush")
}
