package fi.ksykmaps.data

import android.content.Context
import android.os.Build
import fi.ksykmaps.BuildConfig
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Owner alerts: whether this phone opted in, and keeping its FCM token
 * registered with the server's alert device list (separate from the public
 * `push_tokens`, which broadcasts go to).
 */
object AdminAlerts {
    private const val PREFS = "ksyk_admin_alerts"
    private const val KEY_ON = "notify_this_phone"

    fun isEnabled(ctx: Context): Boolean =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ON, false)

    fun setEnabled(ctx: Context, on: Boolean) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ON, on).apply()
    }

    /** Blocking, call off the main thread. Throws [ApiException]; 403 means the account is not the owner. */
    fun register(token: String) {
        Api.post("/admin/alerts/devices", buildJsonObject {
            put("fcmToken", token)
            put("label", "${Build.MANUFACTURER} ${Build.MODEL}".trim())
            put("appVersion", BuildConfig.VERSION_NAME)
        })
    }

    /** Blocking, call off the main thread. */
    fun unregister(token: String) {
        Api.post("/admin/alerts/devices/unregister", buildJsonObject { put("fcmToken", token) })
    }

    /** FCM rotated the token: without this the owner would silently stop getting alerts. */
    fun onTokenRefreshed(ctx: Context, token: String) {
        if (!isEnabled(ctx) || Api.adminToken == null) return
        try {
            register(token)
        } catch (e: Exception) {
            AppLog.warn("FCM", "Alert device re-register failed: ${e.message}")
        }
    }
}
