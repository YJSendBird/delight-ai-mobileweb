//
//  ContentView.swift
//  WebViewApp
//
//  Created by Airen Kang on 11/11/25.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                NavigationLink(destination: WebViewScreen(route: "simple")) {
                    Text("상담하기(Simple) + with 런처")
                        .font(.system(size: 18, weight: .medium))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }

                NavigationLink(destination: WebViewScreen(route: "custom")) {
                    Text("상담하기(Custom)")
                        .font(.system(size: 18, weight: .medium))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }

                NavigationLink(destination: WebViewScreen(route: "custom", initialChannelUrl: "sendbird_group_channel_330117099_9c13d9f044775f214204d94b687f6428f53c1b81")) {
                    Text("상담하기(CUSTOM+URL)")
                        .font(.system(size: 18, weight: .medium))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }

                // 비회원 상담: userId/authToken 없이 진입 → 웹 SDK가 익명(게스트) 세션으로 대화
                NavigationLink(destination: WebViewScreen(route: "simple", isGuest: true)) {
                    Text("비회원 상담")
                        .font(.system(size: 18, weight: .medium))
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
            }
            .padding(24)
        }
    }
}

#Preview {
    ContentView()
}
