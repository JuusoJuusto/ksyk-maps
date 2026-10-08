package fi.ksykmaps.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

private data class TeacherInfo(val name: String, val wilmaProfileUrl: String?)
private data class SubjectInfo(val name: String, val color: String?)

/** In-memory cache of teacher abbreviation → full name and subject code → display name.
 *  Two-phase load: disk cache first (instant), then network refresh in background. */
object LookupStore {
    private var teacherMap: Map<String, TeacherInfo> = emptyMap()
    private var subjectMap: Map<String, SubjectInfo> = emptyMap()

    private var loaded = false
    private var cacheLoaded = false

    /** Phase 1 — load from on-disk API cache (no network). Returns immediately with
     *  whatever was saved on the last successful fetch. Idempotent. */
    suspend fun ensureLoadedFromCache() {
        if (cacheLoaded || loaded) return
        withContext(Dispatchers.IO) {
            Api.getOffline("/subjects")?.let { applySubjects(it) }
            Api.getOffline("/teachers")?.let { applyTeachers(it) }
            cacheLoaded = true
        }
    }

    /** Phase 2 — fetch from network, refreshing the disk cache. Call after
     *  ensureLoadedFromCache so the UI already has something to show. */
    suspend fun ensureLoaded() {
        if (loaded) return
        withContext(Dispatchers.IO) {
            try { applySubjects(Api.get("/subjects")) } catch (_: Throwable) {}
            try { applyTeachers(Api.get("/teachers")) } catch (_: Throwable) {}
            loaded = true
            cacheLoaded = true
        }
    }

    fun resolveTeacher(abbrev: String): String? {
        if (abbrev.isBlank()) return null
        return teacherMap[abbrev]?.name
    }

    fun resolveTeacherUrl(abbrev: String): String? {
        if (abbrev.isBlank()) return null
        return teacherMap[abbrev]?.wilmaProfileUrl
    }

    /** Resolve a Wilma subject code (e.g. "FY1.F") to its display name.
     *  Tries exact match first, then prefix match on "CODE." or "CODE ". */
    fun resolveSubject(code: String): String? {
        if (code.isBlank()) return null
        return subjectInfo(code)?.name
    }

    fun resolveSubjectColor(code: String): String? {
        if (code.isBlank()) return null
        return subjectInfo(code)?.color
    }

    private fun subjectInfo(code: String): SubjectInfo? {
        subjectMap[code]?.let { return it }
        for ((k, v) in subjectMap) {
            if (code.startsWith("$k.") || code.startsWith("$k ")) return v
        }
        return null
    }

    private fun applySubjects(json: JsonElement) {
        subjectMap = (json as? JsonArray)
            ?.mapNotNull { it as? JsonObject }
            ?.mapNotNull { o ->
                val code  = (o["code"]  as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }
                    ?: return@mapNotNull null
                val name  = (o["name"]  as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
                val color = (o["color"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }
                code to SubjectInfo(name, color)
            }?.toMap() ?: emptyMap()
    }

    private fun applyTeachers(json: JsonElement) {
        teacherMap = (json as? JsonArray)
            ?.mapNotNull { it as? JsonObject }
            ?.mapNotNull { o ->
                val abbrev = (o["abbrev"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }
                    ?: return@mapNotNull null
                val first = (o["firstName"] as? JsonPrimitive)?.contentOrNull ?: ""
                val last  = (o["lastName"]  as? JsonPrimitive)?.contentOrNull ?: ""
                val url   = (o["wilmaProfileUrl"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }
                abbrev to TeacherInfo("$first $last".trim(), url)
            }?.toMap() ?: emptyMap()
    }

    /** Call after an admin edit or Wilma sync so the next load re-fetches. */
    fun invalidate() { loaded = false; cacheLoaded = false }
}
