package com.example.webviewsample

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

/**
 * 웹뷰 구성에서의 푸시 수신 샘플.
 *
 * [구조] 네이티브 앱에는 Sendbird SDK가 없으므로 FCM 토큰을 직접 등록하지 않고,
 *       브릿지(`push_token`)로 웹에 전달하면 웹의 SDK가 등록합니다.
 *
 *   FCM → onNewToken → PushTokenHolder 보관
 *       → 웹뷰 로드 완료 시 bridge.sendPushToken() → 웹의 PushTokenRegister
 *       → chatSDK.registerFCMPushTokenForCurrentUser(token)
 *
 * [사전 준비]
 *  1. Firebase 콘솔에서 프로젝트 생성 후 `google-services.json`을 `app/`에 추가
 *  2. Gradle에 google-services 플러그인 적용 (README의 푸시 설정 참고)
 *  3. Firebase 서버 키를 Sendbird 대시보드에 등록
 */
class MyFirebaseMessagingService : FirebaseMessagingService() {

    /**
     * FCM 토큰이 발급되거나 갱신될 때 호출됩니다.
     *
     * 이 시점에는 웹뷰가 떠 있지 않을 수 있으므로 보관만 하고,
     * 웹뷰 로드가 끝난 뒤 전달합니다. (WebViewActivity 참고)
     */
    override fun onNewToken(token: String) {
        Log.d(TAG, "FCM 토큰 수신: ${token.take(12)}…")
        PushTokenHolder.updateToken(token)
    }

    /**
     * 푸시 메시지를 수신했을 때 호출됩니다.
     *
     * Sendbird는 data 메시지로 발송하므로 OS가 알림을 자동 표시하지 않습니다.
     * 아래와 같이 payload를 파싱해 로컬 알림을 직접 만들어야 합니다.
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Sendbird 푸시가 아니면 앱의 기존 처리에 맡깁니다.
        val sendbirdPayload = remoteMessage.data["sendbird"] ?: return

        try {
            val sendbird = JSONObject(sendbirdPayload)
            val message = sendbird.optString("message")
            val channelUrl = sendbird.optJSONObject("channel")?.optString("channel_url")
            val senderName = sendbird.optJSONObject("sender")?.optString("name")
                ?: getString(R.string.app_name)

            Log.d(TAG, "푸시 수신 — channelUrl=$channelUrl")
            showNotification(title = senderName, body = message, channelUrl = channelUrl)
        } catch (e: Exception) {
            Log.e(TAG, "푸시 payload 파싱 실패: ${e.message}")
        }
    }

    /** 로컬 알림을 생성해 표시합니다. 탭하면 상담 웹뷰로 이동합니다. */
    private fun showNotification(title: String, body: String, channelUrl: String?) {
        createNotificationChannelIfNeeded()

        // 알림 탭 시 상담 화면(웹뷰)으로 이동
        val intent = Intent(this, WebViewActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(WebViewActivity.EXTRA_ROUTE, "simple")
            // 특정 대화로 바로 진입시키려면 채널 URL을 함께 전달합니다.
            channelUrl?.let { putExtra(WebViewActivity.EXTRA_INITIAL_CHANNEL_URL, it) }
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_email) // 자사 아이콘으로 교체하세요
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()

        // Android 13+ 에서 POST_NOTIFICATIONS 권한이 없으면 표시되지 않습니다. (MainActivity에서 권한 요청)
        try {
            NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification)
        } catch (e: SecurityException) {
            Log.w(TAG, "알림 권한이 없어 표시하지 못했습니다: ${e.message}")
        }
    }

    private fun createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "상담 알림",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "AI 상담 메시지 알림"
        }
        manager.createNotificationChannel(channel)
    }

    companion object {
        private const val TAG = "SendbirdPush"
        private const val CHANNEL_ID = "ai_agent_consulting"
        private const val NOTIFICATION_ID = 1001
    }
}

/**
 * FCM 토큰 보관소.
 *
 * 토큰은 앱 시작 직후(웹뷰가 열리기 전) 도착하므로, 보관해 두었다가
 * 웹뷰 로드가 끝난 시점에 전달합니다. (전달 타이밍 경합 방지)
 */
object PushTokenHolder {
    @Volatile
    var token: String? = null
        private set

    /** 웹뷰가 준비된 상태에서 토큰이 갱신되면 즉시 전달하기 위한 콜백 */
    @Volatile
    var onTokenReady: ((String) -> Unit)? = null

    fun updateToken(newToken: String) {
        token = newToken
        onTokenReady?.invoke(newToken)
    }
}
