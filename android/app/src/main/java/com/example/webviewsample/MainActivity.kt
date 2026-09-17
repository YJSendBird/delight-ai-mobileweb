package com.example.webviewsample

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

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
}
