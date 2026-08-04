package fi.ksykmaps.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Stdlib-ish HTTP client tuned to look exactly like a Chrome browser
 * request so Cloudflare's Bot Fight Mode doesn't 429 us. Same idea as
 * the Windows app's Api.cs.
 */
object Api {
    var base = "https://ksykmaps.fi/api"
    var sessionEmail: String? = null

    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    private const val UA =
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"

    private fun base(req: Request.Builder) = req
        .header("User-Agent", UA)
        .header("Accept", "application/json, text/plain, */*")
        .header("Accept-Language", "en-US,en;q=0.9,fi;q=0.8")
        .header("Sec-Fetch-Site", "same-origin")
        .header("Sec-Fetch-Mode", "cors")
        .header("Sec-Fetch-Dest", "empty")
        .header("Referer", "https://ksykmaps.fi/")
        .header("X-KSYK-Client", "KSYK-Maps-Android/1.0")

    @Throws(ApiException::class)
    fun get(path: String): JsonElement {
        return try {
            val fresh = request(path, "GET", null)
            DiskCache.write(path, fresh)   // mirror every success so we can serve offline next time
            fresh
        } catch (e: ApiException) {
            // Network unreachable → fall back to the last-good copy on
            // disk. Application errors (401, 404, 5xx) still surface —
            // they usually mean the caller needs to change behavior,
            // not that we should hand back stale data pretending to be
            // fresh. Only status == 0 (IO / no connection) triggers the
            // fallback so a real 404 doesn't quietly serve deleted rooms.
            if (e.status == 0) {
                val cached = DiskCache.read(path)
                if (cached != null) return cached
            }
            throw e
        }
    }

    /** Pure disk read — returns whatever was cached without touching the network. */
    fun getOffline(path: String): JsonElement? = DiskCache.read(path)

    @Throws(ApiException::class)
    fun post(path: String, body: JsonElement): JsonElement = request(path, "POST", body)

    @Throws(ApiException::class)
    fun put(path: String, body: JsonElement): JsonElement = request(path, "PUT", body)

    @Throws(ApiException::class)
    fun delete(path: String): JsonElement = request(path, "DELETE", null)

    private fun request(path: String, method: String, body: JsonElement?): JsonElement {
        val builder = Request.Builder().url(base + path)
        base(builder)

        when (method) {
            "GET" -> builder.get()
            "DELETE" -> builder.delete()
            else -> {
                val rb = (body?.toString() ?: "{}").toRequestBody("application/json".toMediaType())
                if (method == "POST") builder.post(rb) else builder.put(rb)
            }
        }

        try {
            client.newCall(builder.build()).execute().use { resp ->
                val text = resp.body?.string() ?: ""
                if (!resp.isSuccessful) {
                    val niceMsg = try {
                        val parsed = json.parseToJsonElement(text)
                        parsed.toString()
                    } catch (_: Exception) { text }
                    throw ApiException(resp.code, niceMsg)
                }
                return if (text.isEmpty()) json.parseToJsonElement("null") else json.parseToJsonElement(text)
            }
        } catch (e: IOException) {
            throw ApiException(0, e.message ?: "Network error")
        }
    }

    fun friendly(e: Throwable): String = when {
        e is ApiException && e.status == 429 ->
            "Server is rate-limiting (429). Add a Cloudflare WAF allow rule for header X-KSYK-Client."
        e is ApiException && e.status == 404 -> "Endpoint not deployed (404)."
        e is ApiException && e.status == 401 -> "Sign in again."
        e is ApiException && e.status == 0   -> "Couldn't reach the server."
        else -> e.message ?: "Unknown error"
    }
}

class ApiException(val status: Int, message: String) : RuntimeException(message)
