package fi.ksykmaps.ui

import android.content.Context

/**
 * v1.89.0 — user-configurable home dashboard layout.
 *
 * The Home tab used to have a fixed section order:
 *   quick-chips → lesson-status → today-strip → tomorrow-preview →
 *   campus-stats → announcements
 *
 * Users asked to reorder / hide sections (some care about announcements
 * more than the current-lesson card; some want tomorrow at the top).
 * This module owns the persisted preference — order + visibility per
 * section, backed by SharedPreferences. HomeScreen reads the order and
 * a Settings sub-screen writes it.
 */
enum class HomeSection(val id: String, val labelFi: String, val labelEn: String) {
    QUICK_ACTIONS("quick_actions", "Pikapainikkeet",        "Quick actions"),
    LESSON_STATUS("lesson_status", "Nyt tunnilla / seuraava", "Now / next lesson"),
    TODAY_SCHEDULE("today_schedule", "Loput päivän tunnit", "Rest of your day"),
    TOMORROW_PREVIEW("tomorrow_preview", "Huomisen ennakko", "Tomorrow preview"),
    CAMPUS_STATS("campus_stats", "Kampus-tiedot",             "Campus stats"),
    ANNOUNCEMENTS("announcements", "Uutiset",                 "Announcements");

    companion object {
        fun fromId(id: String): HomeSection? = entries.firstOrNull { it.id == id }
    }
}

/**
 * Persisted layout: an ordered list of sections + a visibility flag per
 * section. Encoded as CSV "section_id:visible,section_id:visible,…" so
 * we don't need JSON parsing in the SharedPreferences edit path.
 */
data class HomeLayout(
    val sections: List<Pair<HomeSection, Boolean>>,
) {
    companion object {
        val DEFAULT = HomeLayout(HomeSection.entries.map { it to true })

        fun parse(raw: String?): HomeLayout {
            if (raw.isNullOrBlank()) return DEFAULT
            val seen = mutableSetOf<HomeSection>()
            val out = mutableListOf<Pair<HomeSection, Boolean>>()
            for (part in raw.split(",")) {
                val bits = part.split(":")
                if (bits.size != 2) continue
                val s = HomeSection.fromId(bits[0]) ?: continue
                if (!seen.add(s)) continue
                out += s to (bits[1] == "1")
            }
            // Append any sections we don't know about yet (new sections
            // added in an update should default to visible, at the end).
            for (s in HomeSection.entries) if (s !in seen) out += s to true
            return HomeLayout(out)
        }
    }

    fun encode(): String = sections.joinToString(",") { (s, vis) -> "${s.id}:${if (vis) 1 else 0}" }

    fun isVisible(section: HomeSection): Boolean =
        sections.firstOrNull { it.first == section }?.second ?: true
}

object HomeSectionPrefs {
    private const val PREFS = "ksyk_home_layout"
    private const val KEY = "layout_v1"

    fun load(ctx: Context): HomeLayout {
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
        return HomeLayout.parse(raw)
    }

    fun save(ctx: Context, layout: HomeLayout) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY, layout.encode())
            .apply()
    }
}
