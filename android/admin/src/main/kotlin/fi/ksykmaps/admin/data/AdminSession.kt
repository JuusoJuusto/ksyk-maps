package fi.ksykmaps.admin.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.mutableStateOf
import com.posthog.PostHog

/**
 * Admin sign-in state. The server issues 30-day tokens that
 * /auth/admin-refresh renews, so [refreshIfDue] on each app start keeps the
 * session alive until the app goes unopened for a month.
 */
object AdminSession {
    private const val PREFS = "ksyk_admin_session"
    /** Renew at most twice a day, far inside the server's TTL. */
    private const val REFRESH_INTERVAL_MS = 12L * 60 * 60 * 1000

    private var prefs: SharedPreferences? = null

    var token: String? = null; private set
    var email: String? = null; private set
    var role: String? = null; private set
    var userId: String? = null; private set

    /** True once the server has definitively rejected the token; the shell drops back to sign-in. */
    val expiredState = mutableStateOf(false)

    val isLoggedIn get() = token != null
    val isAdmin get() = role == "admin" || role == "owner"

    fun load(ctx: Context) {
        prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        token = prefs?.getString("token", null)
        email = prefs?.getString("email", null)
        role = prefs?.getString("role", null)
        userId = prefs?.getString("user_id", null)
        prefs?.getString("server", null)?.let { AdminApi.setBaseUrl(it) }
        identifyUser()
    }

    fun save(token: String, email: String, role: String, userId: String?) {
        this.token = token; this.email = email; this.role = role; this.userId = userId
        prefs?.edit()
            ?.putString("token", token)
            ?.putString("email", email)
            ?.putString("role", role)
            ?.putLong("token_refreshed_at", System.currentTimeMillis())
            ?.apply { if (userId != null) putString("user_id", userId) else remove("user_id") }
            ?.apply()
        expiredState.value = false
        identifyUser()
    }

    /** Store a renewed token (and the account's current role, so a demotion takes effect). */
    fun applyRefreshedToken(newToken: String, newRole: String?) {
        token = newToken
        if (newRole != null) role = newRole
        prefs?.edit()
            ?.putString("token", newToken)
            ?.putLong("token_refreshed_at", System.currentTimeMillis())
            ?.apply { if (newRole != null) putString("role", newRole) }
            ?.apply()
    }

    /** Renew the token if the last renewal is old enough. Blocking — call off the main thread. */
    fun refreshIfDue() {
        if (token == null) return
        val last = prefs?.getLong("token_refreshed_at", 0L) ?: 0L
        if (System.currentTimeMillis() - last < REFRESH_INTERVAL_MS) return
        AdminApi.refreshToken()
    }

    /** The server rejected the token for good: sign out and let the UI ask for a fresh sign-in. */
    fun expire() {
        if (token == null) return
        clear()
        expiredState.value = true
    }

    fun saveServer(url: String) {
        AdminApi.setBaseUrl(url)
        prefs?.edit()?.putString("server", url)?.apply()
    }

    fun clear() {
        runCatching { PostHog.reset() }
        token = null; email = null; role = null; userId = null
        prefs?.edit()?.remove("token")?.remove("email")?.remove("role")?.remove("user_id")?.remove("token_refreshed_at")?.apply()
    }

    private fun identifyUser() {
        val stableUserId = userId?.takeIf { it.isNotBlank() } ?: return
        val userEmail = email?.takeIf { it.isNotBlank() } ?: return
        runCatching {
            PostHog.identify(
                stableUserId,
                // PostHog SDK expects Map<String, Any>; coerce nullable role.
                userProperties = mapOf<String, Any>(
                    "email" to userEmail,
                    "role" to (role ?: ""),
                ),
            )
        }
    }
}
