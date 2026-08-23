package fi.ksykmaps.admin.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
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

    @Throws(AdminApiException::class)
    fun get(path: String): JsonElement {
        val req = Request.Builder()
            .url("$baseUrl$path")
            .apply { AdminSession.token?.let { tok -> header("Authorization", "Bearer $tok") } }
            .header("X-Admin-Client", "KSYK-Maps-Admin/1.0")
            .build()
        val resp = client.newCall(req).execute()
        val body = resp.body?.string() ?: ""
        if (!resp.isSuccessful) throw AdminApiException(resp.code, body)
        return json.parseToJsonElement(body)
    }

    @Throws(AdminApiException::class)
    fun post(path: String, jsonBody: String = "{}"): JsonElement {
        val body = jsonBody.toRequestBody("application/json".toMediaType())
        val req = Request.Builder()
            .url("$baseUrl$path")
            .post(body)
            .apply { AdminSession.token?.let { tok -> header("Authorization", "Bearer $tok") } }
            .header("X-Admin-Client", "KSYK-Maps-Admin/1.0")
            .build()
        val resp = client.newCall(req).execute()
        val respBody = resp.body?.string() ?: ""
        if (!resp.isSuccessful) throw AdminApiException(resp.code, respBody)
        return json.parseToJsonElement(if (respBody.isBlank()) "null" else respBody)
    }

    @Throws(AdminApiException::class)
    fun delete(path: String): Unit {
        val req = Request.Builder()
            .url("$baseUrl$path")
            .delete()
            .apply { AdminSession.token?.let { tok -> header("Authorization", "Bearer $tok") } }
            .header("X-Admin-Client", "KSYK-Maps-Admin/1.0")
            .build()
        val resp = client.newCall(req).execute()
        if (!resp.isSuccessful) throw AdminApiException(resp.code, resp.body?.string() ?: "")
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
