package com.example.webviewsample

import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

/**
 * 자사 서비스 링크를 **앱 내비게이션 스택에 쌓아서** 여는 화면
 *
 * ## 왜 별도 화면인가
 * SDK는 메신저 안의 링크를 `window.open(url, '_blank')` 으로 엽니다.
 * `_blank` 는 "새 컨텍스트"를 뜻하므로 **히스토리가 남지 않습니다.**
 * 그대로 두면 뒤로가기 시 돌아갈 지점이 없어 앱이 메인 화면으로 떨어집니다.
 *
 * 이 Activity 를 `startActivity` 로 띄우면 **Activity 스택에 쌓이므로**
 * 뒤로가기 한 번으로 메신저 화면으로 정확히 복귀합니다.
 *
 * ## 같은 WebView 에서 여는 방식과의 차이
 * 메신저가 떠 있는 WebView 에 `loadUrl()` 로 바로 이동시켜도
 * WebView 히스토리는 쌓입니다. 다만 뒤로 돌아올 때 **메신저 페이지가 리로드되어
 * 대화 상태가 초기화**됩니다. 별도 화면 방식은 메신저를 건드리지 않으므로
 * 복귀 시 대화가 그대로 유지됩니다.
 *
 * ## 사용
 * ```kotlin
 * startActivity(
 *     Intent(this, InternalWebActivity::class.java)
 *         .putExtra(InternalWebActivity.EXTRA_URL, url)
 * )
 * ```
 */
class InternalWebActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_URL = "url"
    }

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_webview)

        // 자사 서비스 화면이므로 앱 기본 액션바를 그대로 노출해 뒤로가기를 제공합니다.
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        webView = findViewById(R.id.webView)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
        }
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()

        val url = intent.getStringExtra(EXTRA_URL).orEmpty()
        if (!isAllowed(url)) {
            // 스킴 검증 실패 — 아무것도 로드하지 않고 종료합니다.
            finish()
            return
        }
        webView.loadUrl(url)
    }

    /** `http` / `https` 만 허용합니다. 다른 스킴은 의도하지 않은 화면을 열 수 있습니다. */
    private fun isAllowed(url: String): Boolean {
        val scheme = runCatching { Uri.parse(url).scheme }.getOrNull()?.lowercase()
        return scheme == "http" || scheme == "https"
    }

    /** 액션바의 뒤로가기(←) */
    override fun onSupportNavigateUp(): Boolean {
        onBackPressedDispatcher.onBackPressed()
        return true
    }

    override fun onBackPressed() {
        // 이 화면 안에서 이동한 내역이 있으면 먼저 그쪽을 되돌립니다.
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
