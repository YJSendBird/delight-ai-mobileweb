package com.example.webviewsample

import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class WebViewActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var bridge: WebViewBridge

    companion object {
        /**
         * WebView Configuration
         *
         * Sendbird AI Agent를 사용하기 위한 설정값들입니다.
         */

        const val EXTRA_ROUTE = "route"
        const val EXTRA_INITIAL_CHANNEL_URL = "initialChannelUrl"

        /**
         * 비회원(게스트) 상담 여부
         *
         * `true`면 userId/authToken을 URL에 전달하지 않으며,
         * 웹 SDK가 익명(Anonymous) 세션으로 대화를 시작합니다.
         * (익명 유저 발급과 토큰 갱신은 SDK가 내부 처리하므로 session_token 브릿지가 호출되지 않음)
         */
        const val EXTRA_GUEST = "guest"
        private const val BASE_URL = "http://10.0.2.2:5173"

        // ===== 필수 파라미터 =====

        /**
         * Sendbird Application ID
         *
         * 센드버드 대시보드에서 확인 가능
         */
        private const val APP_ID = "YOUR_APP_ID"

        /**
         * Sendbird AI Agent ID
         *
         * 센드버드 대시보드에서 확인 가능
         */
        private const val AI_AGENT_ID = "YOUR_AI_AGENT_ID"

        /**
         * Sendbird User ID
         *
         * 생성한 센드버드 유저의 아이디
         *
         * @see <a href="https://sendbird.com/docs/chat/platform-api/v3/user/creating-users/create-a-user">유저 생성 API</a>
         */
        // 앱에 생성한 사용자 아이디로 교체
        private const val USER_ID = "YOUR_USER_ID"

        /**
         * User Authentication Token
         *
         * 유저에 대해 발급받은 세션 토큰.
         * 세션 핸들러를 통한 인증 갱신 시에도 동일한 절차로 발급 필요.
         *
         * @see <a href="https://sendbird.com/docs/chat/platform-api/v3/user/managing-session-tokens/issue-a-session-token#1-issue-a-session-token">세션 토큰 발급 API</a>
         */
        // 위 사용자에 대해 발급한 세션 토큰으로 교체
        private const val AUTH_TOKEN = "YOUR_AUTH_TOKEN"

        // ===== 옵션 파라미터 =====

        /**
         * 활성 대화 존재 여부
         *
         * - `false`: Conversation 화면으로 진입
         * - `true`: ConversationList 화면으로 진입
         */
        private const val HAS_ACTIVE_CONVERSATION = false

        /**
         * Initial Context Object
         *
         * 웹뷰에 전달할 초기 컨텍스트 정보
         * 키-값 쌍으로 구성되며, URL 파라미터로 `context_{key}` 형태로 전달됩니다.
         */
        private val INITIAL_CONTEXT_OBJECT = mapOf(
            "appVersion" to "1.0.0",
            "platform" to "android"
        )

        private fun buildUrl(route: String, initialChannelUrl: String? = null, isGuest: Boolean = false): String {
            val urlWithRoute = "$BASE_URL/$route"
            val builder = Uri.parse(urlWithRoute).buildUpon()
                .appendQueryParameter("appId", APP_ID)
                .appendQueryParameter("aiAgentId", AI_AGENT_ID)
                .appendQueryParameter("hasActiveConversation", HAS_ACTIVE_CONVERSATION.toString())

            // 비회원(게스트) 상담이면 userId/authToken을 전달하지 않음 → 웹 SDK가 익명 세션으로 시작
            if (!isGuest) {
                builder.appendQueryParameter("userId", USER_ID)
                builder.appendQueryParameter("authToken", AUTH_TOKEN)
            }

            // initialContextObject를 context_ prefix로 URL params에 추가
            INITIAL_CONTEXT_OBJECT.forEach { (key, value) ->
                builder.appendQueryParameter("context_$key", value)
            }

            initialChannelUrl?.let {
                builder.appendQueryParameter("initialChannelUrl", it)
            }

            return builder.build().toString()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_webview)

        // 액션바(헤더) 숨기기
        supportActionBar?.hide()

        webView = findViewById(R.id.webView)
        bridge = WebViewBridge(this, webView)
        setupWebView()
        loadUrl()
    }

    private fun setupWebView() {
        webView.apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true

                // 줌 비활성화
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false

                loadWithOverviewMode = true
                useWideViewPort = true
            }

            // 스크롤 바운스 비활성화
            overScrollMode = WebView.OVER_SCROLL_NEVER

            // Bridge 인터페이스 등록
            addJavascriptInterface(bridge, "Android")

            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
        }
    }

    private fun loadUrl() {
        val route = intent.getStringExtra(EXTRA_ROUTE) ?: "simple"
        val initialChannelUrl = intent.getStringExtra(EXTRA_INITIAL_CHANNEL_URL)
        val isGuest = intent.getBooleanExtra(EXTRA_GUEST, false)
        val url = buildUrl(route, initialChannelUrl, isGuest)
        webView.loadUrl(url)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    // Bridge 구현
    inner class WebViewBridge(
        private val activity: WebViewActivity,
        private val webView: WebView
    ) {
        private val mainHandler = Handler(Looper.getMainLooper())

        @JavascriptInterface
        fun postMessage(message: String) {
            try {
                val json = JSONObject(message)
                val event = json.getString("event")
                val data = json.optJSONObject("data")
                val requestId = json.optString("requestId", null)

                Log.d("Bridge", "Received event: $event, data: $data")

                // 이벤트 처리
                handleEvent(event, data, requestId)
            } catch (e: Exception) {
                Log.e("Bridge", "Error parsing message: ${e.message}")
            }
        }

        private fun handleEvent(event: String, data: JSONObject?, requestId: String?) {
            when (event) {
                "quit" -> {
                    // 뒤로 가기
                    mainHandler.post {
                        activity.finish()
                    }
                }

                "session_token" -> {
                    // 세션 토큰 반환 (더미)
                    if (requestId != null) {
                        val token = "dummy_session_token_android_${java.util.UUID.randomUUID()}"
                        val responseEvent = "__response_$requestId"
                        // String을 JSON string으로 전송
                        val jsonData = "\"$token\""
                        val script = "window.__bridgeReceive('$responseEvent', $jsonData);"
                        mainHandler.post {
                            webView.evaluateJavascript(script) { result ->
                                Log.d("Bridge", "Session token sent: $token")
                            }
                        }
                    }
                }

                "session_error" -> {
                    // 세션 에러 처리
                    mainHandler.post {
                        android.widget.Toast.makeText(activity, "세션이 만료되었습니다. 잠시 후 다시 시도해주세요.", android.widget.Toast.LENGTH_LONG).show()
                        activity.finish()
                    }
                }

                else -> {
                    Log.d("Bridge", "Unhandled event: $event")
                }
            }
        }

        // 웹으로 응답 전송 (양방향 통신)
        private fun sendResponse(requestId: String?, data: JSONObject?) {
            if (requestId == null) return

            val responseEvent = "__response_$requestId"
            sendToWeb(responseEvent, data)
        }

        // 웹으로 이벤트 전송
        fun sendToWeb(event: String, data: JSONObject?) {
            val jsonData = data?.toString() ?: "null"
            val script = "window.__bridgeReceive('$event', $jsonData);"

            mainHandler.post {
                webView.evaluateJavascript(script) { result ->
                    Log.d("Bridge", "Sent to web: $event")
                }
            }
        }

        // Context 업데이트를 웹으로 전송 (Example)
        fun patchContextExample(orderId: String) {
            val contextData = JSONObject().apply {
                put("orderId", orderId)
            }
            sendToWeb("patch_context", contextData)
        }

        // Push Token을 웹으로 전송 (Example)
        fun sendPushToken(token: String) {
            val data = JSONObject().apply {
                put("token", token)
            }
            sendToWeb("push_token", data)
        }
    }
}
