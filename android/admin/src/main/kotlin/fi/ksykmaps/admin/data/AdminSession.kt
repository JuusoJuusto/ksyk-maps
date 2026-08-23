package fi.ksykmaps.admin.data

import android.content.Context
import android.content.SharedPreferences

object AdminSession {
    private const val PREFS = "ksyk_admin_session"

    private var prefs: SharedPreferences? = null

    var token: String? = null; private set
    var email: String? = null; private set
    var role: String? = null; private set

    val isLoggedIn get() = token != null
    val isAdmin get() = role == "admin" || role == "owner"

    fun load(ctx: Context) {
        prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        token = prefs?.getString("token", null)
        email = prefs?.getString("email", null)
        role = prefs?.getString("role", null)
        prefs?.getString("server", null)?.let { AdminApi.setBaseUrl(it) }
    }

    fun save(token: String, email: String, role: String) {
        this.token = token; this.email = email; this.role = role
        prefs?.edit()?.putString("token", token)?.putString("email", email)?.putString("role", role)?.apply()
    }

    fun saveServer(url: String) {
        AdminApi.setBaseUrl(url)
        prefs?.edit()?.putString("server", url)?.apply()
    }

    fun clear() {
        token = null; email = null; role = null
        prefs?.edit()?.remove("token")?.remove("email")?.remove("role")?.apply()
    }
}
