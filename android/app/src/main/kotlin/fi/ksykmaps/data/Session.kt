package fi.ksykmaps.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.mutableStateOf
import com.posthog.PostHog
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/**
 * Lightweight session holder.
 *
 * Persists the admin email + HMAC token in SharedPreferences so the
 * user stays logged in across app restarts without re-entering credentials.
 * The token is a signed JWT-like payload issued by /auth/admin-login
 * (30-day TTL, renewed by /auth/admin-refresh on every app start so it
 * only lapses after a month of not opening the app). Beacon and map data live in Firestore via the API —
 * both the web admin and this app read the same documents.
 *
 * `signedInState` and `adminState` are Compose-observable so screens
 * automatically recompose when the user signs in / out.
 */
object Session {
    var user: JsonObject? = null
        internal set(value) {
            field = value
            adminState.value = extractAdmin(value)
        }
    var rememberedEmail: String? = null
        private set

    /** Reactive: any composable reading this re-renders on sign-in / sign-out. */
    val signedInState = mutableStateOf(false)
    /** Reactive: true iff the current user has role == "admin" (or "owner"). */
    val adminState = mutableStateOf(false)

    val isSignedIn: Boolean get() = signedInState.value
    val isAdmin: Boolean get() = adminState.value

    private const val PREFS = "ksyk_session"
    private const val KEY_EMAIL = "remembered_email"
    private const val KEY_TOKEN = "admin_token"
    private const val KEY_ROLE = "admin_role"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_REFRESHED_AT = "token_refreshed_at"
    /** Sliding session: renew at most twice a day, far inside the server's TTL. */
    private const val REFRESH_INTERVAL_MS = 12L * 60 * 60 * 1000

    /** True once the server has definitively rejected our token; AppShell shows a "sign in again" prompt. */
    val sessionExpiredState = mutableStateOf(false)

    fun load(ctx: Context) {
        val sp = prefs(ctx)
        rememberedEmail = sp.getString(KEY_EMAIL, null)
        val token = sp.getString(KEY_TOKEN, null)
        if (token != null) {
            Api.adminToken = token
            Api.sessionEmail = rememberedEmail
            signedInState.value = true
            // Restore cached admin flag so the admin tab shows immediately
            // on cold start (before we've had a chance to re-verify with
            // the server). The token itself gates the actual API calls.
            val role = sp.getString(KEY_ROLE, null)
            adminState.value = role?.let { isAdminRole(it) } ?: false
            val userId = sp.getString(KEY_USER_ID, null)
            val email = rememberedEmail
            if (!userId.isNullOrBlank() && !email.isNullOrBlank()) {
                identifyUser(userId, email, role)
            }
        }
    }

    fun saveToDataStore(ctx: Context, email: String, token: String? = null) {
        val sp = prefs(ctx)
        val role = extractRole(user)
        val userId = extractUserId(user)
        sp.edit()
            .putString(KEY_EMAIL, email)
            .apply {
                if (userId != null) putString(KEY_USER_ID, userId) else remove(KEY_USER_ID)
            }
            .apply {
                if (token != null) putString(KEY_TOKEN, token).putLong(KEY_REFRESHED_AT, System.currentTimeMillis())
                else remove(KEY_TOKEN)
            }
            .apply { if (role != null) putString(KEY_ROLE, role) else remove(KEY_ROLE) }
            .apply()
        rememberedEmail = email
        if (token != null) Api.adminToken = token
        Api.sessionEmail = email
        signedInState.value = true
        adminState.value = extractAdmin(user)
        sessionExpiredState.value = false
        if (userId != null) identifyUser(userId, email, role)
    }

    /**
     * Store a token the server just renewed (and the account's current role,
     * so a demotion takes effect). Called from Api.refreshAdminToken.
     */
    fun applyRefreshedToken(token: String, freshUser: JsonObject?) {
        if (freshUser != null) user = freshUser
        Api.adminToken = token
        val ctx = appContext() ?: return
        val role = extractRole(user)
        prefs(ctx).edit()
            .putString(KEY_TOKEN, token)
            .putLong(KEY_REFRESHED_AT, System.currentTimeMillis())
            .apply { if (role != null) putString(KEY_ROLE, role) }
            .apply()
    }

    /** Renew the token if the last renewal is old enough. Blocking — call off the main thread. */
    fun refreshIfDue(ctx: Context) {
        if (!signedInState.value || Api.adminToken == null) return
        val last = prefs(ctx).getLong(KEY_REFRESHED_AT, 0L)
        if (System.currentTimeMillis() - last < REFRESH_INTERVAL_MS) return
        Api.refreshAdminToken()
    }

    /** The server rejected our token for good: drop the session and let the UI ask for a fresh sign-in. */
    fun expire() {
        if (!signedInState.value) return
        val ctx = appContext() ?: return
        clear(ctx)
        sessionExpiredState.value = true
    }

    private fun appContext(): Context? =
        runCatching { fi.ksykmaps.KsykApp.instance }.getOrNull()

    fun clear(ctx: Context) {
        val sp = prefs(ctx)
        sp.edit().remove(KEY_EMAIL).remove(KEY_TOKEN).remove(KEY_ROLE).remove(KEY_USER_ID).remove(KEY_REFRESHED_AT).apply()
        runCatching { PostHog.reset() }
        rememberedEmail = null
        user = null
        Api.sessionEmail = null
        Api.adminToken = null
        signedInState.value = false
        adminState.value = false
    }

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun extractUserId(user: JsonObject?): String? =
        (user?.get("id") as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }

    private fun identifyUser(userId: String, email: String, role: String?) {
        runCatching {
            // PostHog SDK expects Map<String, Any> (no nulls). Coerce
            // null role to empty string so the identify call type-checks.
            PostHog.identify(
                userId,
                userProperties = mapOf<String, Any>(
                    "email" to email,
                    "role" to (role ?: ""),
                ),
            )
        }
    }

    private fun extractRole(u: JsonObject?): String? =
        (u?.get("role") as? JsonPrimitive)?.contentOrNull

    private fun isAdminRole(role: String): Boolean =
        role.equals("admin", ignoreCase = true) ||
        role.equals("owner", ignoreCase = true) ||
        role.equals("superadmin", ignoreCase = true)

    private fun extractAdmin(u: JsonObject?): Boolean =
        extractRole(u)?.let { isAdminRole(it) } ?: false
}
