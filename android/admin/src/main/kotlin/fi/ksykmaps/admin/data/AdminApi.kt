package fi.ksykmaps.admin.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

object AdminApi {
    private var baseUrl = "https://ksykmaps.fi/api"

    val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    fun setBaseUrl(url: String) { baseUrl = url.trimEnd('/') }
    fun getBaseUrl() = baseUrl

    private fun request(path: String) = Request.Builder()
        .url("$baseUrl$path")
        .apply { AdminSession.token?.let { tok -> header("Authorization", "Bearer $tok") } }
        .header("X-Admin-Client", "KSYK-Maps-Admin/1.0")

    @Throws(AdminApiException::class)
    fun get(path: String): JsonElement = withRefresh(path) { getOnce(path) }

    @Throws(AdminApiException::class)
    fun post(path: String, jsonBody: String = "{}"): JsonElement = withRefresh(path) { postOnce(path, jsonBody) }

    @Throws(AdminApiException::class)
    fun put(path: String, jsonBody: String = "{}"): JsonElement = withRefresh(path) { putOnce(path, jsonBody) }

    @Throws(AdminApiException::class)
    fun delete(path: String): Unit = withRefresh(path) { deleteOnce(path) }

    private fun getOnce(path: String): JsonElement {
        val resp = client.newCall(request(path).build()).execute()
        val body = resp.body?.string() ?: ""
        if (!resp.isSuccessful) throw AdminApiException(resp.code, body)
        return json.parseToJsonElement(body)
    }

    private fun postOnce(path: String, jsonBody: String): JsonElement {
        val body = jsonBody.toRequestBody("application/json".toMediaType())
        val resp = client.newCall(request(path).post(body).build()).execute()
        val respBody = resp.body?.string() ?: ""
        if (!resp.isSuccessful) throw AdminApiException(resp.code, respBody)
        return json.parseToJsonElement(if (respBody.isBlank()) "null" else respBody)
    }

    private fun putOnce(path: String, jsonBody: String): JsonElement {
        val body = jsonBody.toRequestBody("application/json".toMediaType())
        val resp = client.newCall(request(path).put(body).build()).execute()
        val respBody = resp.body?.string() ?: ""
        if (!resp.isSuccessful) throw AdminApiException(resp.code, respBody)
        return json.parseToJsonElement(if (respBody.isBlank()) "null" else respBody)
    }

    private fun deleteOnce(path: String) {
        val resp = client.newCall(request(path).delete().build()).execute()
        if (!resp.isSuccessful) throw AdminApiException(resp.code, resp.body?.string() ?: "")
    }

    private const val RECENT_REFRESH_MS = 30_000L
    @Volatile private var lastRefreshOkAt = 0L

    /**
     * A 401 while holding a token usually means it aged out: renew it and
     * replay the call once instead of surfacing an error. Skipped right after
     * a refresh, when a second 401 isn't about the token.
     */
    private fun <T> withRefresh(path: String, block: () -> T): T {
        try {
            return block()
        } catch (e: AdminApiException) {
            if (e.status == 401 && AdminSession.token != null && !path.startsWith("/auth/") &&
                System.currentTimeMillis() - lastRefreshOkAt > RECENT_REFRESH_MS &&
                refreshToken()
            ) {
                return block()
            }
            throw e
        }
    }

    /**
     * Trade the current token for a fresh one. Only a definitive 401 ends the
     * session; network errors, 5xx and a server without the endpoint (404)
     * leave it alone so a flaky connection can't sign the admin out.
     */
    @Synchronized
    fun refreshToken(): Boolean {
        if (AdminSession.token == null) return false
        return try {
            val obj = postOnce("/auth/admin-refresh", "{}") as? JsonObject
            val fresh = (obj?.get("adminToken") as? JsonPrimitive)?.contentOrNull
            if (fresh.isNullOrBlank()) {
                false
            } else {
                val role = ((obj?.get("user") as? JsonObject)?.get("role") as? JsonPrimitive)?.contentOrNull
                AdminSession.applyRefreshedToken(fresh, role)
                lastRefreshOkAt = System.currentTimeMillis()
                true
            }
        } catch (e: AdminApiException) {
            if (e.status == 401) AdminSession.expire()
            false
        } catch (_: IOException) {
            false
        }
    }

    fun friendly(e: Exception): String = when {
        e is AdminApiException && e.status == 401 -> "Session expired — please log in again."
        e is AdminApiException && e.status == 403 -> "Access denied. Admin role required."
        e is AdminApiException && e.status == 429 -> "Rate limited. Please wait and retry."
        e is AdminApiException && e.status == 0   -> "Network unreachable."
        e is AdminApiException -> "Server error (${e.status})"
        else -> e.message ?: "Unknown error"
    }
}

class AdminApiException(val status: Int, message: String) : Exception("HTTP $status: $message")
