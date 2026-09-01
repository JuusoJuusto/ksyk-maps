package fi.ksykmaps.data

import fi.ksykmaps.BuildConfig
import fi.ksykmaps.data.ErrorReporter
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
    /** HMAC admin token issued by /auth/admin-login (7-day TTL). */
    var adminToken: String? = null

    private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    private const val UA =
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"

    private fun base(req: Request.Builder, includeAuth: Boolean = false) = req
        .header("User-Agent", UA)
        .header("Accept", "application/json, text/plain, */*")
        .header("Accept-Language", "en-US,en;q=0.9,fi;q=0.8")
        .header("Sec-Fetch-Site", "same-origin")
        .header("Sec-Fetch-Mode", "cors")
        .header("Sec-Fetch-Dest", "empty")
        .header("Referer", "https://ksykmaps.fi/")
        .header("X-KSYK-Client", "KSYK-Maps-Android/1.0")
        // Vercel Attack Challenge Mode bypass. `x-vercel-protection-bypass`
        // is the well-known Vercel header (matches VERCEL_AUTOMATION_BYPASS_SECRET
        // env var). `x-ksyk-bypass-token` is our fallback for custom WAF Skip
        // rules — set a Firewall → Custom Rule → Skip Attack Challenge when
        // Request Header `x-ksyk-bypass-token` equals BuildConfig.BYPASS_TOKEN.
        .header("x-vercel-protection-bypass", BuildConfig.BYPASS_TOKEN)
        .header("x-vercel-set-bypass-cookie", "samesitenone")
        .header("x-ksyk-bypass-token", BuildConfig.BYPASS_TOKEN)
        .apply { if (includeAuth) adminToken?.let { header("Authorization", "Bearer $it") } }

    @Throws(ApiException::class)
    fun get(path: String): JsonElement {
        return try {
            val fresh = request(path, "GET", null)
            DiskCache.write(path, fresh)   // mirror every success so we can serve offline next time
            AppLog.info("Api", "GET $path → live OK (${fresh.toString().length} chars)")
            fresh
        } catch (e: ApiException) {
            AppLog.warn("Api", "GET $path → live failed status=${e.status} msg=${e.message?.take(80)}")
            // Three-tier fallback for read-only map data endpoints:
            //   1. Disk cache — last successful response we saved
            //   2. GitHub Raw snapshot — data/snapshot/<endpoint>.json in the repo,
            //      updated periodically. Not behind Vercel bot protection.
            //   3. Bundled asset — snapshot/<endpoint>.json shipped in the APK.
            // Only for status 0 (network), 429 (bot check), 5xx (server error).
            // Real auth/not-found (401/403/404) still surfaces.
            if (e.status == 0 || e.status == 429 || e.status >= 500) {
                DiskCache.read(path)?.let {
                    AppLog.info("Api", "GET $path → disk cache")
                    return it
                }
                fetchGithubSnapshot(path)?.let {
                    DiskCache.write(path, it)
                    AppLog.info("Api", "GET $path → GitHub snapshot")
                    return it
                }
                loadBundledSnapshot(path)?.let {
                    AppLog.info("Api", "GET $path → bundled snapshot")
                    return it
                }
                AppLog.error("Api", "GET $path → all fallbacks failed")
            }
            throw e
        }
    }

    /**
     * Fetch a data snapshot from GitHub Raw. This bypasses Vercel bot
     * protection entirely (github.com has no such gate) and gives the app
     * fresh-ish data even when the primary API is unreachable.
     */
    private fun fetchGithubSnapshot(path: String): JsonElement? {
        val slug = path.trim('/').substringBefore('?').substringBefore('/').lowercase()
        val allowed = setOf("buildings", "rooms", "doors", "hallways")
        if (slug !in allowed) return null
        val url = "https://raw.githubusercontent.com/JuusoJuusto/ksyk-maps/main/data/snapshot/$slug.json"
        return try {
            val req = Request.Builder().url(url).get()
                .header("User-Agent", UA)
                .header("Accept", "application/json")
                .build()
            client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return null
                val text = resp.body?.string() ?: return null
                if (text.isBlank()) return null
                json.parseToJsonElement(text)
            }
        } catch (_: Exception) { null }
    }

    /**
     * Load a JSON snapshot shipped inside the APK (android/app/src/main/assets/snapshot/).
     * Guarantees the map ALWAYS shows something even on first launch with no network.
     */
    private fun loadBundledSnapshot(path: String): JsonElement? {
        val slug = path.trim('/').substringBefore('?').substringBefore('/').lowercase()
        val allowed = setOf("buildings", "rooms", "doors", "hallways")
        if (slug !in allowed) return null
        val ctx = try { fi.ksykmaps.KsykApp.instance } catch (_: Exception) { return null }
        return try {
            val text = ctx.assets.open("snapshot/$slug.json").bufferedReader().use { it.readText() }
            if (text.isBlank()) null else json.parseToJsonElement(text)
        } catch (_: Exception) { null }
    }

    /** Pure disk read — returns whatever was cached without touching the network.
     *  Falls back to the APK's bundled snapshot if nothing on disk. */
    fun getOffline(path: String): JsonElement? =
        DiskCache.read(path) ?: loadBundledSnapshot(path)

    @Throws(ApiException::class)
    fun post(path: String, body: JsonElement): JsonElement = request(path, "POST", body)

    /**
     * Send a raw JSON body via POST with no response parsing and no
     * exception on failure. Used by AppLog to forward log entries to
     * /session/heartbeat without recursively logging (and risking loops)
     * if the beacon itself fails.
     */
    fun postFireAndForget(path: String, rawJsonBody: String) {
        try {
            val builder = Request.Builder().url(base + path)
            base(builder, includeAuth = false)
            val rb = rawJsonBody.toRequestBody("application/json".toMediaType())
            builder.post(rb)
            client.newCall(builder.build()).execute().use { /* discard */ }
        } catch (_: Throwable) { /* silent */ }
    }

    @Throws(ApiException::class)
    fun put(path: String, body: JsonElement): JsonElement = request(path, "PUT", body)

    @Throws(ApiException::class)
    fun delete(path: String): JsonElement = request(path, "DELETE", null)

    private fun request(path: String, method: String, body: JsonElement?): JsonElement {
        val builder = Request.Builder().url(base + path)
        // Always include auth when a token is available — GET to /admin/*
        // and /users endpoints require it; public endpoints ignore it safely.
        base(builder, includeAuth = true)

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
                    val ex = ApiException(resp.code, niceMsg)
                    if (resp.code == 401 || resp.code == 403) {
                        ErrorReporter.auth("authentication_failed", mapOf("path" to path, "status" to resp.code))
                    } else if (resp.code >= 500) {
                        ErrorReporter.api("api_server_error", ex, path, mapOf("status" to resp.code))
                    }
                    throw ex
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
