package fi.ksykmaps.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.json.JsonObject

/**
 * Lightweight session holder.
 *
 * Keeps the signed-in user and the cached email in memory; persists the
 * email to SharedPreferences so a relaunched app remembers who was last
 * signed in. (We re-prompt for password — we don't store secrets.)
 *
 * Beacon data + everything else lives in Firestore via the API, so
 * "sync" between desktop, mobile and the website is automatic — both
 * apps fetch the same documents.
 */
object Session {
    var user: JsonObject? = null
        internal set
    var rememberedEmail: String? = null
        private set

    private const val PREFS = "ksyk_session"
    private const val KEY_EMAIL = "remembered_email"

    fun load(ctx: Context) {
        val sp = prefs(ctx)
        rememberedEmail = sp.getString(KEY_EMAIL, null)
    }

    fun saveToDataStore(ctx: Context, email: String) {
        val sp = prefs(ctx)
        sp.edit().putString(KEY_EMAIL, email).apply()
        rememberedEmail = email
    }

    fun clear(ctx: Context) {
        val sp = prefs(ctx)
        sp.edit().remove(KEY_EMAIL).apply()
        rememberedEmail = null
        user = null
        Api.sessionEmail = null
    }

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
