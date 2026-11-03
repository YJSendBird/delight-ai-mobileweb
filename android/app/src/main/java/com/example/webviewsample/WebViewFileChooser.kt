package com.example.webviewsample

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import java.io.File

/**
 * WebView 파일 첨부(`<input type="file">`) 처리기
 *
 * ## 왜 필요한가
 * Android WebView는 `<input type="file">`을 **스스로 처리하지 않습니다.**
 * 앱이 [WebChromeClient.onShowFileChooser]를 구현하지 않으면 첨부 버튼을 눌러도
 * 파일 선택기가 열리지 않고 아무 일도 일어나지 않습니다.
 * (iOS WKWebView는 OS가 자체 처리하므로 별도 구현이 필요 없습니다 — 플랫폼 차이)
 *
 * ## 크래시를 막는 네 가지 규칙
 * 파일 첨부 구현에서 앱이 종료되는 원인은 대부분 아래 네 가지입니다.
 *
 * 1. **콜백은 정확히 한 번만 호출한다.**
 *    WebView는 [ValueCallback]이 반드시 1회 호출되기를 기대합니다.
 *    호출하지 않으면 input이 잠긴 채로 남아 다음 첨부 시도가 먹통이 되고,
 *    두 번 호출하면 WebView 내부 상태가 깨집니다.
 *    취소했을 때도 `onReceiveValue(null)`을 반드시 호출해야 합니다.
 *
 * 2. **결과가 돌아왔을 때 콜백이 사라졌을 수 있다.**
 *    갤러리/카메라가 떠 있는 동안 메모리 부족으로 Activity가 파괴되면,
 *    복귀 시 콜백 참조가 null입니다. 이때 널 체크 없이 호출하면 NPE로 앱이 죽습니다.
 *    **삼성 기기처럼 백그라운드 회수가 공격적인 환경에서 재현율이 높습니다.**
 *    개발자 옵션의 "활동 유지 안함"을 켜면 100% 재현되므로 검증에 쓰세요.
 *
 * 3. **런타임 권한을 직접 다루지 않는다.**
 *    아래 구현은 Photo Picker와 Storage Access Framework만 사용하므로
 *    `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE` 권한이 **전혀 필요 없습니다.**
 *    권한 거부·정책 변경으로 인한 크래시 경로가 통째로 사라집니다.
 *
 * 4. **카메라를 쓸 때만 FileProvider가 필요하다.**
 *    [ENABLE_CAMERA_CAPTURE]가 `true`일 때만 동작하며,
 *    `AndroidManifest.xml`의 `<provider>`와 `res/xml/file_paths.xml`이 함께 있어야 합니다.
 *    설정이 없으면 `IllegalArgumentException: Failed to find configured root`로 죽습니다.
 *
 * ## 사용법
 * ```kotlin
 * // Activity.onCreate() 안에서 — 반드시 STARTED 이전에 생성해야 합니다.
 * fileChooser = WebViewFileChooser(this)
 *
 * webView.webChromeClient = object : WebChromeClient() {
 *     override fun onShowFileChooser(
 *         webView: WebView?,
 *         filePathCallback: ValueCallback<Array<Uri>>?,
 *         fileChooserParams: FileChooserParams?
 *     ): Boolean = fileChooser.onShowFileChooser(filePathCallback, fileChooserParams)
 * }
 * ```
 */
class WebViewFileChooser(private val activity: AppCompatActivity) {

    companion object {
        private const val TAG = "WebViewFileChooser"

        /** 저장된 인스턴스 상태 키 — 카메라 촬영 결과 URI 보존용 */
        private const val STATE_CAMERA_URI = "WebViewFileChooser.cameraUri"

        /**
         * 카메라 촬영 지원 여부
         *
         * `true`로 켜려면 아래 두 가지가 함께 필요합니다.
         * - `AndroidManifest.xml`에 `androidx.core.content.FileProvider` 등록
         * - `res/xml/file_paths.xml`에 캐시 경로 선언
         *
         * 참고: Sendbird AI Agent SDK는 `<input>`에 `capture` 속성을 붙이지 않으므로,
         * 이 값이 `false`여도 OS 파일 선택 시트가 카메라를 제안하는 경우가 있습니다.
         */
        private const val ENABLE_CAMERA_CAPTURE = true

        /** 다중 선택 시 최대 장수 */
        private const val MAX_MULTIPLE_ITEMS = 10
    }

    /**
     * WebView가 넘겨준 콜백.
     *
     * 결과를 전달하는 즉시 null로 비웁니다 — 이중 호출을 구조적으로 막기 위함입니다.
     */
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    /** 카메라 촬영 결과가 저장될 위치 (FileProvider content:// URI) */
    private var cameraImageUri: Uri? = null

    // ── ActivityResult 런처 ────────────────────────────────────────────────
    // 필드에서 바로 등록합니다. registerForActivityResult는 Activity가 STARTED가 되기
    // 전에 호출해야 하므로, 이 객체를 onCreate() 안에서 생성해야 합니다.

    /** 사진 — Photo Picker (권한 불필요) */
    private val pickImages: ActivityResultLauncher<PickVisualMediaRequest> =
        activity.registerForActivityResult(
            ActivityResultContracts.PickMultipleVisualMedia(MAX_MULTIPLE_ITEMS)
        ) { uris -> deliver(uris.toTypedArray()) }

    /** 사진 1장 — Photo Picker (권한 불필요) */
    private val pickSingleImage: ActivityResultLauncher<PickVisualMediaRequest> =
        activity.registerForActivityResult(
            ActivityResultContracts.PickVisualMedia()
        ) { uri -> deliver(if (uri != null) arrayOf(uri) else emptyArray()) }

    /** 파일 — Storage Access Framework (권한 불필요) */
    private val openDocuments: ActivityResultLauncher<Array<String>> =
        activity.registerForActivityResult(
            ActivityResultContracts.OpenMultipleDocuments()
        ) { uris -> deliver(uris.toTypedArray()) }

    /** 파일 1개 — Storage Access Framework (권한 불필요) */
    private val openDocument: ActivityResultLauncher<Array<String>> =
        activity.registerForActivityResult(
            ActivityResultContracts.OpenDocument()
        ) { uri -> deliver(if (uri != null) arrayOf(uri) else emptyArray()) }

    /** 카메라 촬영 — FileProvider URI에 결과를 기록 */
    private val takePicture: ActivityResultLauncher<Uri> =
        activity.registerForActivityResult(
            ActivityResultContracts.TakePicture()
        ) { saved ->
            val uri = cameraImageUri
            cameraImageUri = null
            deliver(if (saved && uri != null) arrayOf(uri) else emptyArray())
        }

    // ── 상태 저장/복원 ─────────────────────────────────────────────────────

    /**
     * Activity가 파괴될 때 카메라 URI를 보존합니다.
     * [WebViewActivity.onSaveInstanceState]에서 호출하세요.
     *
     * 콜백 자체는 직렬화할 수 없으므로 복원되지 않습니다.
     * 복원 불가 상황은 [deliver]의 널 체크가 안전하게 흡수합니다.
     */
    fun onSaveInstanceState(outState: Bundle) {
        cameraImageUri?.let { outState.putString(STATE_CAMERA_URI, it.toString()) }
    }

    /** [WebViewActivity.onCreate]에서 savedInstanceState와 함께 호출하세요. */
    fun onRestoreInstanceState(savedInstanceState: Bundle?) {
        savedInstanceState?.getString(STATE_CAMERA_URI)?.let { cameraImageUri = Uri.parse(it) }
    }

    // ── 진입점 ─────────────────────────────────────────────────────────────

    /**
     * [WebChromeClient.onShowFileChooser]에서 그대로 위임받는 메서드.
     *
     * @return 선택기를 띄웠으면 `true`. `false`를 반환하면 WebView가 콜백을 스스로 정리합니다.
     */
    fun onShowFileChooser(
        callback: ValueCallback<Array<Uri>>?,
        params: WebChromeClient.FileChooserParams?
    ): Boolean {
        if (callback == null) return false

        // [규칙 1] 이전 요청이 아직 열려 있으면 먼저 닫습니다.
        // 이걸 빠뜨리면 WebView의 input이 잠긴 채로 남아 다음 첨부가 동작하지 않습니다.
        filePathCallback?.let {
            Log.w(TAG, "이전 파일 선택 요청이 완료되지 않아 취소 처리합니다.")
            it.onReceiveValue(null)
        }
        filePathCallback = callback

        val acceptTypes = params?.acceptTypes
            ?.filter { it.isNotBlank() }
            ?: emptyList()
        val allowMultiple = params?.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE
        val imagesOnly = acceptTypes.isNotEmpty() && acceptTypes.all { it.startsWith("image/") }

        Log.d(TAG, "onShowFileChooser: accept=$acceptTypes multiple=$allowMultiple imagesOnly=$imagesOnly")

        return try {
            when {
                imagesOnly && ENABLE_CAMERA_CAPTURE -> askPhotoSource(allowMultiple)
                imagesOnly -> launchPhotoPicker(allowMultiple)
                else -> launchDocumentPicker(acceptTypes, allowMultiple)
            }
            true
        } catch (e: Exception) {
            // [규칙 1] 선택기를 띄우지 못했으면 반드시 콜백을 비웁니다.
            Log.e(TAG, "파일 선택기를 열지 못했습니다.", e)
            deliver(emptyArray())
            false
        }
    }

    // ── 선택기 실행 ────────────────────────────────────────────────────────

    /** 카메라 / 앨범 중 선택하는 다이얼로그 */
    private fun askPhotoSource(allowMultiple: Boolean) {
        AlertDialog.Builder(activity)
            .setTitle(R.string.file_chooser_title)
            .setItems(
                arrayOf(
                    activity.getString(R.string.file_chooser_camera),
                    activity.getString(R.string.file_chooser_gallery)
                )
            ) { _, which ->
                if (which == 0) launchCamera() else launchPhotoPicker(allowMultiple)
            }
            // [규칙 1] 다이얼로그를 취소해도 콜백을 비워야 합니다.
            .setOnCancelListener { deliver(emptyArray()) }
            .show()
    }

    /** Photo Picker — 런타임 권한이 필요 없습니다. */
    private fun launchPhotoPicker(allowMultiple: Boolean) {
        val request = PickVisualMediaRequest.Builder()
            .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly)
            .build()
        if (allowMultiple) pickImages.launch(request) else pickSingleImage.launch(request)
    }

    /** Storage Access Framework — 런타임 권한이 필요 없습니다. */
    private fun launchDocumentPicker(acceptTypes: List<String>, allowMultiple: Boolean) {
        val mimeTypes = if (acceptTypes.isEmpty()) arrayOf("*/*") else acceptTypes.toTypedArray()
        if (allowMultiple) openDocuments.launch(mimeTypes) else openDocument.launch(mimeTypes)
    }

    /**
     * 카메라 촬영
     *
     * [규칙 4] FileProvider 설정이 없으면 여기서
     * `IllegalArgumentException: Failed to find configured root`가 발생합니다.
     * 호출부의 try-catch가 이를 받아 콜백을 정리하므로 앱이 죽지는 않습니다.
     */
    private fun launchCamera() {
        val dir = File(activity.cacheDir, "camera").apply { mkdirs() }
        val file = File(dir, "capture_${System.currentTimeMillis()}.jpg")
        val uri = FileProvider.getUriForFile(
            activity,
            "${activity.packageName}.fileprovider",
            file
        )
        cameraImageUri = uri
        takePicture.launch(uri)
    }

    // ── 결과 전달 ──────────────────────────────────────────────────────────

    /**
     * 선택 결과를 WebView로 돌려줍니다.
     *
     * [규칙 2] **콜백이 null일 수 있습니다.** 갤러리/카메라가 떠 있는 동안
     * Activity가 파괴되었다가 복구된 경우입니다. 널 체크 없이 호출하면 NPE로 앱이 종료됩니다.
     * 여기서는 조용히 무시하고 사용자가 다시 시도하도록 둡니다.
     */
    private fun deliver(uris: Array<Uri>) {
        val callback = filePathCallback
        if (callback == null) {
            Log.w(TAG, "결과가 도착했지만 콜백이 없습니다. (Activity 재생성 추정) uris=${uris.size}")
            return
        }
        // [규칙 1] 이중 호출을 막기 위해 호출 전에 참조를 비웁니다.
        filePathCallback = null

        // 취소는 빈 배열이 아니라 null로 알려야 WebView가 정상적으로 상태를 해제합니다.
        callback.onReceiveValue(if (uris.isEmpty()) null else uris)
        Log.d(TAG, "파일 선택 결과 전달: ${uris.size}건")
    }

    /**
     * Activity가 종료될 때 남아 있는 요청을 정리합니다.
     * [WebViewActivity.onDestroy]에서 호출하세요.
     */
    fun cancelPending() {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
    }
}
