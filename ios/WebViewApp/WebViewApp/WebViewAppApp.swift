//
//  WebViewAppApp.swift
//  WebViewApp
//
//  Created by Airen Kang on 11/11/25.
//

import SwiftUI

@main
struct WebViewAppApp: App {
    // 푸시 권한 요청 / APNs 토큰 수신을 위해 AppDelegate를 연결합니다. (PushManager.swift 참고)
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
