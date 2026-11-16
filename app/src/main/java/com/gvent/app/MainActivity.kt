package com.gvent.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.net.toUri
import androidx.core.content.edit
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.io.ByteArrayInputStream
import java.util.Locale
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    private lateinit var root: FrameLayout
    private var webView: WebView? = null
    private var errorView: View? = null
    private var serverOrigin: String? = null
    private var pendingCsv: String? = null
    private var pendingReply: JavaScriptReplyProxy? = null

    override fun attachBaseContext(newBase: Context) {
        val prefs = newBase.getSharedPreferences("GventPrefs", MODE_PRIVATE)
        val lang = prefs.getString("app-language", "es") ?: "es"
        val locale = Locale.forLanguageTag(lang)
        Locale.setDefault(locale)
        val config = Configuration(newBase.resources.configuration)
        config.setLocale(locale)
        super.attachBaseContext(newBase.createConfigurationContext(config))
    }

    private val saveCsv = registerForActivityResult(
        ActivityResultContracts.CreateDocument("text/csv")
    ) { uri ->
        val csv = pendingCsv
        val reply = pendingReply
        pendingCsv = null
        pendingReply = null
        if (csv != null && reply != null) {
            if (uri == null) {
                sendResult(reply, "cancelled")
            } else {
                try {
                    checkNotNull(contentResolver.openOutputStream(uri, "wt"))
                        .bufferedWriter(Charsets.UTF_8).use {
                            it.write("\uFEFF")
                            it.write(csv)
                        }
                    sendResult(reply, "saved")
                } catch (_: Exception) {
                    sendResult(reply, "error")
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(BACKGROUND),
            navigationBarStyle = SystemBarStyle.dark(BACKGROUND)
        )
        root = FrameLayout(this).apply { setBackgroundColor(BACKGROUND) }
        setContentView(root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val safeArea = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout() or
                    WindowInsetsCompat.Type.ime()
            )
            view.setPadding(safeArea.left, safeArea.top, safeArea.right, safeArea.bottom)
            insets
        }
        ViewCompat.requestApplyInsets(root)

        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            val content = panel()
            content.addView(label(getString(R.string.update_webview), 18f))
            root.addView(content)
            return
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val current = webView
                if (current == null) {
                    finish()
                    return
                }
                current.evaluateJavascript(
                    "window.dispatchEvent(new Event('gasvent:back', {cancelable:true}))"
                ) { notHandled ->
                    if (notHandled == "true" || notHandled == "null") finish()
                }
            }
        })
        val prefs = getSharedPreferences("GventPrefs", MODE_PRIVATE)
        val saved = prefs.getString("portal-origin", null)
        if (saved != null && validOrigin(saved) != null) openPortal(saved) else showSetup()
    }

    private fun validOrigin(value: String): String? {
        return runCatching {
            val uri = value.trim().toUri()
            val host = uri.host
            if (uri.scheme != "https" || host.isNullOrBlank() ||
                uri.userInfo != null || uri.port !in listOf(-1, 443) ||
                host == "localhost" || host.endsWith(".localhost")) {
                null
            } else {
                "https://${host.lowercase()}"
            }
        }.getOrNull()
    }

    private fun showSetup() {
        webView?.let {
            removeBridge(it)
            it.stopLoading()
            root.removeView(it)
            it.destroy()
        }
        webView = null
        root.removeAllViews()
        errorView = null
        val content = panel()
        content.addView(label("Gvent", 34f, MINT))
        content.addView(label(getString(R.string.connect_site), 24f))
        content.addView(label(getString(R.string.enter_site_hint), 14f))

        val prefs = getSharedPreferences("GventPrefs", MODE_PRIVATE)
        val address = EditText(this).apply {
            isSingleLine = true
            setTextColor(Color.WHITE)
            setHintTextColor(Color.rgb(113, 139, 120))
            hint = getString(R.string.url_hint)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_URI
            setText(prefs.getString("portal-origin", ""))
        }
        content.addView(address)
        val warning = label("", 13f, Color.rgb(239, 180, 165))
        content.addView(warning)

        content.addView(action(getString(R.string.open_gvent)) {
            val origin = validOrigin(address.text.toString())
            if (origin == null) {
                warning.setText(R.string.invalid_site_url)
            } else {
                prefs.edit { putString("portal-origin", origin) }
                openPortal(origin)
            }
        })
        root.addView(content)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun openPortal(origin: String) {
        root.removeAllViews()
        errorView = null
        serverOrigin = origin
        val browser = WebView(this)
        webView = browser
        root.addView(browser, FrameLayout.LayoutParams(-1, -1))
        browser.setBackgroundColor(BACKGROUND)
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false)
        browser.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
        }
        val trustedHost = origin.toUri().host
        fun trusted(uri: Uri): Boolean {
            return uri.scheme == "https" &&
                uri.host == trustedHost &&
                (uri.port == -1 || uri.port == 443)
        }
        browser.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView, request: WebResourceRequest
            ): WebResourceResponse? {
                if (trusted(request.url)) return null
                return WebResourceResponse(
                    "text/plain", "UTF-8", 403, "Blocked",
                    emptyMap(), ByteArrayInputStream(ByteArray(0))
                )
            }
            override fun shouldOverrideUrlLoading(
                view: WebView, request: WebResourceRequest
            ): Boolean = !trusted(request.url)

            override fun onReceivedError(
                view: WebView, request: WebResourceRequest, error: WebResourceError
            ) {
                if (request.isForMainFrame) showConnectionError()
            }

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
                pendingCsv = null
                pendingReply = null
                root.removeView(view)
                if (webView === view) webView = null
                view.destroy()
                showConnectionError()
                return true
            }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(
                browser, "GasVentAndroid", setOf(origin)
            ) { _, message, sourceOrigin, isMainFrame, reply ->
                if (isMainFrame && trusted(sourceOrigin)) receiveMessage(message.data, reply)
            }
        }
        browser.loadUrl("$origin/")
    }

    private fun showConnectionError() {
        if (errorView != null || isDestroyed) return
        val content = panel()
        content.setBackgroundColor(BACKGROUND)
        content.addView(label(getString(R.string.no_connection), 24f, MINT))
        content.addView(label(getString(R.string.check_connection), 14f))
        content.addView(action(getString(R.string.retry)) {
            errorView?.let(root::removeView)
            errorView = null
            serverOrigin?.let {
                if (webView == null) openPortal(it) else webView?.loadUrl("$it/")
            }
        })
        content.addView(action(getString(R.string.change_site_address)) { showSetup() })
        errorView = content
        root.addView(content, FrameLayout.LayoutParams(-1, -1))
    }

    private fun panel() = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(28), dp(48), dp(28), dp(28))
        setBackgroundColor(BACKGROUND)
    }
    private fun label(value: String, size: Float, color: Int = Color.rgb(211, 228, 216)) =
        TextView(this).apply {
            text = value
            textSize = size
            setTextColor(color)
            setPadding(0, dp(12), 0, dp(16))
        }
    private fun action(value: String, onClick: () -> Unit) = Button(this).apply {
        text = value
        setTextColor(Color.rgb(25, 53, 35))
        backgroundTintList = android.content.res.ColorStateList.valueOf(MINT)
        isAllCaps = false
        setOnClickListener { onClick() }
    }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun receiveMessage(data: String?, reply: JavaScriptReplyProxy) {
        if (data == null || data.length > 1_000_000) {
            sendResult(reply, "error")
            return
        }
        try {
            val payload = JSONObject(data)
            if (payload.optString("type") != "exportCsv") return
            if (pendingCsv != null) {
                sendResult(reply, "busy")
                return
            }
            val filename = payload.optString("filename", "Gvent-activity.csv")
                .replace(Regex("[^a-zA-Z0-9._-]"), "_").take(100)
                .let { if (it.endsWith(".csv")) it else "$it.csv" }
            pendingCsv = payload.getString("csv")
            pendingReply = reply
            saveCsv.launch(filename)
        } catch (_: Exception) {
            pendingCsv = null
            pendingReply = null
            sendResult(reply, "error")
        }
    }

    private fun sendResult(reply: JavaScriptReplyProxy, status: String) {
        if (isDestroyed) return
        val result = JSONObject().put("type", "exportResult").put("status", status).toString()
        runCatching {
            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                reply.postMessage(result)
            }
        }
    }
    private fun removeBridge(browser: WebView) {
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.removeWebMessageListener(browser, "GasVentAndroid")
        }
    }
    override fun onResume() {
        super.onResume()
        webView?.onResume()
        webView?.evaluateJavascript("window.dispatchEvent(new Event('gvent:resume'))", null)
    }
    override fun onPause() {
        webView?.evaluateJavascript("window.dispatchEvent(new Event('gvent:pause'))", null)
        webView?.onPause()
        super.onPause()
    }
    override fun onStop() { CookieManager.getInstance().flush(); super.onStop() }
    override fun onDestroy() {
        pendingCsv = null
        pendingReply = null
        webView?.let {
            removeBridge(it)
            it.stopLoading()
            it.destroy()
        }
        webView = null
        super.onDestroy()
    }

    companion object {
        private val BACKGROUND = Color.rgb(17, 21, 20)
        private val MINT = Color.rgb(162, 229, 186)
    }
}
