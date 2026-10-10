package fi.ksykmaps.data

import android.os.Build
import com.posthog.PostHog
import fi.ksykmaps.BuildConfig
import io.sentry.Sentry as SentrySDK
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Centralised PostHog error reporting.
 *
 * All errors that are not app crashes (those go through KsykApp's
 * uncaughtExceptionHandler) are routed here so PostHog Error Tracking
 * gets a consistent set of event names + properties.
 *
 * Usage:
 *   ErrorReporter.map("map_load_failed", throwable, mapOf("floor" to 2))
 *   ErrorReporter.api("api_request_failed", throwable, mapOf("path" to "/rooms"))
 *
 * Design:
 *   - Every call is wrapped in runCatching — telemetry NEVER crashes the app.
 *   - Properties are merged with common device/version fields before sending.
 *   - Sensitive values (tokens, passwords, URLs containing credentials) are
 *     never included.
 */
object ErrorReporter {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private fun common(): Map<String, Any> = mapOf(
        "platform"     to "android",
        "app_version"  to BuildConfig.VERSION_NAME,
        "version_code" to BuildConfig.VERSION_CODE,
        "android_sdk"  to Build.VERSION.SDK_INT,
        "device"       to "${Build.MANUFACTURER} ${Build.MODEL}",
    )

    private fun send(event: String, extra: Map<String, Any?> = emptyMap()) {
        runCatching {
            PostHog.capture(
                event,
                properties = common() + extra.filterValues { it != null }
                    .mapValues { it.value as Any },
            )
        }
    }

    // Post a single error log to the admin panel backend (fire-and-forget).
    private fun reportToBackend(level: String, message: String, tag: String, err: Throwable?) {
        scope.launch {
            try {
                val stackTrace = err?.stackTraceToString()?.take(2000)
                val sb = StringBuilder()
                sb.append("{\"level\":\"").append(level).append("\"")
                sb.append(",\"message\":\"").append(escapeJson(message.take(500))).append("\"")
                sb.append(",\"source\":\"android\"")
                sb.append(",\"url\":\"android:").append(escapeJson(tag)).append("\"")
                sb.append(",\"metadata\":{")
                sb.append("\"app_version\":\"").append(BuildConfig.VERSION_NAME).append("\"")
                sb.append(",\"device\":\"").append(escapeJson("${Build.MANUFACTURER} ${Build.MODEL}")).append("\"")
                sb.append(",\"android_sdk\":").append(Build.VERSION.SDK_INT)
                if (err != null) sb.append(",\"error_type\":\"").append(escapeJson(err.javaClass.simpleName)).append("\"")
                sb.append("}")
                if (stackTrace != null) {
                    sb.append(",\"errorStack\":\"").append(escapeJson(stackTrace)).append("\"")
                }
                sb.append("}")
                Api.postFireAndForget("/logs", sb.toString())
            } catch (_: Throwable) { /* telemetry never crashes the app */ }
        }
    }

    private fun escapeJson(s: String): String {
        val out = StringBuilder(s.length)
        for (c in s) when {
            c == '\\' -> out.append("\\\\")
            c == '"' -> out.append("\\\"")
            c == '\n' -> out.append("\\n")
            c == '\r' -> out.append("\\r")
            c == '\t' -> out.append("\\t")
            c.code < 0x20 -> out.append("\\u").append(String.format("%04x", c.code))
            else -> out.append(c)
        }
        return out.toString()
    }

    fun map(event: String, err: Throwable? = null, extra: Map<String, Any?> = emptyMap()) {
        send(event, mapOf(
            "error_message" to err?.message?.take(200),
            "error_type"    to err?.javaClass?.simpleName,
        ) + extra)
        if (err != null) runCatching { SentrySDK.captureException(err) }
        reportToBackend("error", "${event}: ${err?.message ?: "unknown"}", "map", err)
    }

    fun api(event: String, err: Throwable? = null, path: String? = null, extra: Map<String, Any?> = emptyMap()) {
        val status = (err as? ApiException)?.status
        send(event, mapOf(
            "error_message" to err?.message?.take(200),
            "error_type"    to err?.javaClass?.simpleName,
            "path"          to path,
            "status_code"   to status,
        ) + extra)
        if (err != null) runCatching { SentrySDK.captureException(err) }
        // Only report 5xx and network errors — 401/403/404 are expected during normal operation.
        if (status == null || status == 0 || status >= 500) {
            reportToBackend("error", "${event} ${path ?: ""}: ${err?.message ?: "unknown"}", "api", err)
        }
    }

    fun auth(event: String, extra: Map<String, Any?> = emptyMap()) {
        send(event, mapOf("area" to "authentication") + extra)
        reportToBackend("warn", "auth: $event", "auth", null)
    }

    fun general(event: String, err: Throwable? = null, extra: Map<String, Any?> = emptyMap()) {
        send(event, mapOf(
            "error_message" to err?.message?.take(200),
            "error_type"    to err?.javaClass?.simpleName,
        ) + extra)
        if (err != null) runCatching { SentrySDK.captureException(err) }
        reportToBackend("error", "${event}: ${err?.message ?: "unknown"}", "general", err)
    }
}
