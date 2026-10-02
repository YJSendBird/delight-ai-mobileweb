package com.example.webviewsample

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 푸시 알림 권한 요청 (Android 13+) — 권한이 없으면 알림이 표시되지 않습니다.
        requestNotificationPermissionIfNeeded()

        val btnAiConsulting = findViewById<Button>(R.id.btnAiConsulting)
        val btnConsulting = findViewById<Button>(R.id.btnConsulting)
        val btnConsultingWithUrl = findViewById<Button>(R.id.btnConsultingWithUrl)
        val btnGuestConsulting = findViewById<Button>(R.id.btnGuestConsulting)

        btnAiConsulting.setOnClickListener {
            val intent = Intent(this, WebViewActivity::class.java).apply {
                putExtra(WebViewActivity.EXTRA_ROUTE, "simple")
            }
            startActivity(intent)
        }

        btnConsulting.setOnClickListener {
            val intent = Intent(this, WebViewActivity::class.java).apply {
                putExtra(WebViewActivity.EXTRA_ROUTE, "custom")
            }
            startActivity(intent)
        }

        btnConsultingWithUrl.setOnClickListener {
            val intent = Intent(this, WebViewActivity::class.java).apply {
                putExtra(WebViewActivity.EXTRA_ROUTE, "custom")
                putExtra(WebViewActivity.EXTRA_INITIAL_CHANNEL_URL, "sendbird_group_channel_330117099_9c13d9f044775f214204d94b687f6428f53c1b81")
            }
            startActivity(intent)
        }

        // 비회원 상담: userId/authToken 없이 진입 → 웹 SDK가 익명(게스트) 세션으로 대화
        btnGuestConsulting.setOnClickListener {
            val intent = Intent(this, WebViewActivity::class.java).apply {
                putExtra(WebViewActivity.EXTRA_ROUTE, "simple")
                putExtra(WebViewActivity.EXTRA_GUEST, true)
            }
            startActivity(intent)
        }
    }

    /** Android 13+ 에서는 알림 표시에 런타임 권한이 필요합니다. */
    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { isGranted ->
            android.util.Log.d("SendbirdPush", "알림 권한 결과: $isGranted")
        }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return

        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED

        if (!granted) {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }
}
