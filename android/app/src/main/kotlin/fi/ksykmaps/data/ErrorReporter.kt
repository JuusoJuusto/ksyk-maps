package fi.ksykmaps.data

import android.os.Build
import com.posthog.PostHog
import fi.ksykmaps.BuildConfig

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

    fun map(event: String, err: Throwable? = null, extra: Map<String, Any?> = emptyMap()) {
        send(event, mapOf(
            "error_message" to err?.message?.take(200),
            "error_type"    to err?.javaClass?.simpleName,
        ) + extra)
    }

    fun api(event: String, err: Throwable? = null, path: String? = null, extra: Map<String, Any?> = emptyMap()) {
        val status = (err as? ApiException)?.status
        send(event, mapOf(
            "error_message" to err?.message?.take(200),
            "error_type"    to err?.javaClass?.simpleName,
            "path"          to path,
            "status_code"   to status,
        ) + extra)
    }

    fun auth(event: String, extra: Map<String, Any?> = emptyMap()) {
        send(event, mapOf("area" to "authentication") + extra)
    }

    fun general(event: String, err: Throwable? = null, extra: Map<String, Any?> = emptyMap()) {
        send(event, mapOf(
            "error_message" to err?.message?.take(200),
            "error_type"    to err?.javaClass?.simpleName,
        ) + extra)
    }
}
