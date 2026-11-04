//
//  InternalWebViewController.swift
//  WebViewApp
//
//  자사 서비스 링크를 앱 안에서 여는 화면
//

import UIKit
import WebKit

/**
 자사 서비스 링크 전용 WebView 화면

 ## 왜 필요한가
 SDK는 메신저 안의 링크를 `window.open(url, "_blank")` 으로 엽니다.
 `_blank` 는 "새 컨텍스트"를 뜻하므로 **히스토리가 남지 않습니다.**
 그대로 두면 뒤로가기 시 돌아갈 지점이 없어 앱이 메인 화면으로 떨어집니다.

 이 화면을 `UINavigationController` 로 감싸 모달로 띄우면
 **뒤로·닫기 버튼이 제공되고**, 메신저 WebView 는 그대로 살아 있으므로
 닫았을 때 **대화 내용과 스크롤 위치가 유지**됩니다.

 ## 같은 WebView 에서 여는 방식과의 차이
 메신저가 떠 있는 WebView 에 `load(_:)` 로 바로 이동시켜도
 `backForwardList` 에 히스토리는 쌓입니다. 다만 되돌아올 때
 **메신저 페이지가 리로드되어 대화 상태가 초기화**됩니다.
 */
final class InternalWebViewController: UIViewController {

    private let url: URL
    private var webView: WKWebView!

    init(url: URL) {
        self.url = url
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        title = "서비스 안내"

        navigationItem.leftBarButtonItem = UIBarButtonItem(
            title: "닫기", style: .plain, target: self, action: #selector(close)
        )

        webView = WKWebView(frame: .zero)
        webView.allowsBackForwardNavigationGestures = true   // 가장자리 스와이프로 뒤로
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        webView.load(URLRequest(url: url))
    }

    /// 화면을 닫고 메신저로 복귀합니다.
    ///
    /// 이 화면 안에서의 페이지 이동은 가장자리 스와이프
    /// (`allowsBackForwardNavigationGestures`)로 되돌릴 수 있습니다.
    @objc private func close() {
        dismiss(animated: true)
    }
}
