package fi.ksykmaps.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.json.JsonObject

/**
 * Lightweight session holder.
 *
 * Persists the admin email + HMAC token in SharedPreferences so the
 * user stays logged in across app restarts without re-entering credentials.
 * The token is a signed JWT-like payload issued by /auth/admin-login
 * (7-day TTL). Beacon and map data live in Firestore via the API —
 * both the web admin and this app read the same documents.
 */
object Session {
    var user: JsonObject? = null
        internal set
    var rememberedEmail: String? = null
        private set

    private const val PREFS = "ksyk_session"
    private const val KEY_EMAIL = "remembered_email"
    private const val KEY_TOKEN = "admin_token"

    fun load(ctx: Context) {
        val sp = prefs(ctx)
        rememberedEmail = sp.getString(KEY_EMAIL, null)
        val token = sp.getString(KEY_TOKEN, null)
        if (token != null) Api.adminToken = token
    }

    fun saveToDataStore(ctx: Context, email: String, token: String? = null) {
        val sp = prefs(ctx)
        sp.edit()
            .putString(KEY_EMAIL, email)
            .apply { if (token != null) putString(KEY_TOKEN, token) else remove(KEY_TOKEN) }
            .apply()
        rememberedEmail = email
        if (token != null) Api.adminToken = token
    }

    fun clear(ctx: Context) {
        val sp = prefs(ctx)
        sp.edit().remove(KEY_EMAIL).remove(KEY_TOKEN).apply()
        rememberedEmail = null
        user = null
        Api.sessionEmail = null
        Api.adminToken = null
    }

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
