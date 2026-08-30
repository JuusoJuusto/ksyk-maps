package fi.ksykmaps.admin.data

import android.content.Context
import android.content.SharedPreferences
import com.posthog.PostHog

object AdminSession {
    private const val PREFS = "ksyk_admin_session"

    private var prefs: SharedPreferences? = null

    var token: String? = null; private set
    var email: String? = null; private set
    var role: String? = null; private set
    var userId: String? = null; private set

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
            ?.apply { if (userId != null) putString("user_id", userId) else remove("user_id") }
            ?.apply()
        identifyUser()
    }

    fun saveServer(url: String) {
        AdminApi.setBaseUrl(url)
        prefs?.edit()?.putString("server", url)?.apply()
    }

    fun clear() {
        runCatching { PostHog.reset() }
        token = null; email = null; role = null; userId = null
        prefs?.edit()?.remove("token")?.remove("email")?.remove("role")?.remove("user_id")?.apply()
    }

    private fun identifyUser() {
        val stableUserId = userId?.takeIf { it.isNotBlank() } ?: return
        val userEmail = email?.takeIf { it.isNotBlank() } ?: return
        runCatching {
            PostHog.identify(
                stableUserId,
                mapOf(
                    "email" to userEmail,
                    "role" to role,
                ),
            )
        }
    }
}
