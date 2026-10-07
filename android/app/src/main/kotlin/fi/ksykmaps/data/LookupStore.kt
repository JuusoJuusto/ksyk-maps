package fi.ksykmaps.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

private data class TeacherInfo(val name: String, val wilmaProfileUrl: String?)

/** In-memory cache of teacher abbreviation → full name and subject code → display name.
 *  Loaded once per process via [ensureLoaded]; safe to call concurrently. */
object LookupStore {
    // abbrev → TeacherInfo(name, wilmaProfileUrl?)
    private var teacherMap: Map<String, TeacherInfo> = emptyMap()
    // prefix-code → Finnish name (e.g. "FY1" → "Fysiikka 1")
    private var subjectMap: Map<String, String> = emptyMap()

    private var loaded = false

    suspend fun ensureLoaded() {
        if (loaded) return
        withContext(Dispatchers.IO) {
            try {
                val teachers = Api.get("/teachers")
                teacherMap = (teachers as? JsonArray)
                    ?.mapNotNull { it as? JsonObject }
                    ?.mapNotNull { o ->
                        val abbrev = (o["abbrev"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }
                            ?: return@mapNotNull null
                        val first = (o["firstName"] as? JsonPrimitive)?.contentOrNull ?: ""
                        val last  = (o["lastName"]  as? JsonPrimitive)?.contentOrNull ?: ""
                        val url   = (o["wilmaProfileUrl"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }
                        abbrev to TeacherInfo("$first $last".trim(), url)
                    }?.toMap() ?: emptyMap()
            } catch (_: Throwable) { /* keep empty on network failure */ }

            try {
                val subjects = Api.get("/subjects")
                subjectMap = (subjects as? JsonArray)
                    ?.mapNotNull { it as? JsonObject }
                    ?.mapNotNull { o ->
                        val code = (o["code"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }
                            ?: return@mapNotNull null
                        val name = (o["name"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
                        code to name
                    }?.toMap() ?: emptyMap()
            } catch (_: Throwable) { /* keep empty on network failure */ }

            loaded = true
        }
    }

    /** Resolve a Wilma abbreviation (e.g. "JLä") to a teacher's full name. */
    fun resolveTeacher(abbrev: String): String? {
        if (abbrev.isBlank()) return null
        return teacherMap[abbrev]?.name
    }

    /** Resolve a Wilma abbreviation to the teacher's Wilma profile URL if configured. */
    fun resolveTeacherUrl(abbrev: String): String? {
        if (abbrev.isBlank()) return null
        return teacherMap[abbrev]?.wilmaProfileUrl
    }

    /** Resolve a Wilma subject code (e.g. "FY1.F") to its display name.
     *  Tries exact match first, then prefix match on "CODE." or "CODE ". */
    fun resolveSubject(code: String): String? {
        if (code.isBlank()) return null
        subjectMap[code]?.let { return it }
        for ((k, v) in subjectMap) {
            if (code.startsWith("$k.") || code.startsWith("$k ")) return v
        }
        return null
    }

    /** Call after an admin edit so the next [ensureLoaded] re-fetches. */
    fun invalidate() { loaded = false }
}
