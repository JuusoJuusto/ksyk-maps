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
 * (7-day TTL). Beacon and map data live in Firestore via the API —
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
            .apply { if (token != null) putString(KEY_TOKEN, token) else remove(KEY_TOKEN) }
            .apply { if (role != null) putString(KEY_ROLE, role) else remove(KEY_ROLE) }
            .apply()
        rememberedEmail = email
        if (token != null) Api.adminToken = token
        Api.sessionEmail = email
        signedInState.value = true
        adminState.value = extractAdmin(user)
        if (userId != null) identifyUser(userId, email, role)
    }

    fun clear(ctx: Context) {
        val sp = prefs(ctx)
        sp.edit().remove(KEY_EMAIL).remove(KEY_TOKEN).remove(KEY_ROLE).remove(KEY_USER_ID).apply()
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
