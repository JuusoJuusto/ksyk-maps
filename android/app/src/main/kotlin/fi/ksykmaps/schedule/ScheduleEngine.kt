package fi.ksykmaps.schedule

import fi.ksykmaps.ui.Jakso
import fi.ksykmaps.ui.ScheduleEntry
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

/**
 * v4.7.2 — Centralized schedule logic.
 *
 * The user reported a real bug for months: "Nyt meneillään" (Current
 * Lesson) sometimes showed a class from a different day or a different
 * jakso because widgets compared bare HH:mm times without accounting
 * for date or period boundaries. Every widget + reminder scheduler was
 * doing the comparison inline and getting subtly different results.
 *
 * This engine is the fix: pure functions that take weekly-recurring
 * schedule entries + jakso date ranges, materialize them into concrete
 * `LocalDateTime` lessons for the requested date window, and then
 * answer questions ("what's on now?", "what's next?", "what's on
 * Wednesday?") using full timestamp math. Every consumer — the three
 * widgets, the reminder scheduler, and the timetable screen (later) —
 * goes through this single source of truth.
 *
 * The engine deliberately has no Android dependencies (no `Context`,
 * no logging, no coroutines) so it's trivially unit-testable and can
 * be called from a widget's synchronous `onUpdate` path.
 */

/**
 * A concrete-date lesson resolved from a weekly ScheduleEntry against
 * the current jakso list. Two entries for the same weekday but in
 * different jaksot produce two different [TimedLesson]s on their
 * respective actual dates.
 */
data class TimedLesson(
    val entryId: String,
    val subject: String,
    val roomNumber: String,
    val roomId: String,
    val teacher: String,
    val teacherAbbrev: String = "",
    val jaksoId: String,
    val startDateTime: LocalDateTime,
    val endDateTime: LocalDateTime,
) {
    val startTime: LocalTime get() = startDateTime.toLocalTime()
    val endTime:   LocalTime get() = endDateTime.toLocalTime()
    val date:      LocalDate get() = startDateTime.toLocalDate()

    fun isActiveAt(t: LocalDateTime): Boolean =
        !t.isBefore(startDateTime) && t.isBefore(endDateTime)

    fun isPastAt(t: LocalDateTime): Boolean = !endDateTime.isAfter(t)

    fun minutesUntilStart(from: LocalDateTime): Long =
        java.time.Duration.between(from, startDateTime).toMinutes()

    fun minutesUntilEnd(from: LocalDateTime): Long =
        java.time.Duration.between(from, endDateTime).toMinutes()
}

object ScheduleEngine {

    // ── Materialization ────────────────────────────────────────────

    /**
     * Expand weekly-recurring [entries] into concrete-dated lessons for
     * every calendar date in `[startDate, endDate]` (inclusive on both
     * ends). Applies jakso-date-range filtering so an entry with
     * `jaksoId = "j1"` only produces lessons on dates inside j1's range.
     * Entries with `jaksoId = "all"` (or blank) apply to every date.
     *
     * The returned list is sorted by startDateTime ascending.
     */
    fun materialize(
        entries: List<ScheduleEntry>,
        jaksot: List<Jakso>,
        startDate: LocalDate,
        endDate: LocalDate,
    ): List<TimedLesson> {
        if (entries.isEmpty()) return emptyList()
        if (endDate.isBefore(startDate)) return emptyList()

        // Pre-compute jakso ranges for O(1) lookup
        val jaksoRanges: Map<String, Pair<LocalDate, LocalDate>> = jaksot.associate { j ->
            j.id to Pair(parseIsoOrMax(j.startDate, LocalDate.MIN), parseIsoOrMax(j.endDate, LocalDate.MAX))
        }

        val out = ArrayList<TimedLesson>(entries.size * 2)
        var d = startDate
        while (!d.isAfter(endDate)) {
            val dow = d.dayOfWeek.value // Mon=1..Sun=7
            for (e in entries) {
                if (e.dayOfWeek != dow) continue

                // Jakso filter — either "all"/blank (applies always) or
                // must match a jakso whose date range contains d.
                val ej = e.jaksoId.ifBlank { "all" }
                if (ej != "all") {
                    val range = jaksoRanges[ej] ?: continue
                    if (d.isBefore(range.first) || d.isAfter(range.second)) continue
                }

                val start = parseHhmmOrNull(e.startHhmm) ?: continue
                val end   = parseHhmmOrNull(e.endHhmm) ?: continue
                out += TimedLesson(
                    entryId       = e.id,
                    subject       = e.subject.ifBlank { "?" },
                    roomNumber    = e.roomNumber,
                    roomId        = e.roomId,
                    teacher       = e.teacher,
                    teacherAbbrev = e.teacherAbbrev,
                    jaksoId       = ej,
                    startDateTime = LocalDateTime.of(d, start),
                    endDateTime   = LocalDateTime.of(d, end),
                )
            }
            d = d.plusDays(1)
        }
        // In-place sort — the materialization already visits dates
        // ascending so this only needs to break ties within a single
        // date by start time, then subject for determinism.
        out.sortWith(compareBy({ it.startDateTime }, { it.subject }))
        return out
    }

    // ── Queries against a materialized lesson list ─────────────────

    /** The lesson in progress at [now], or null if none. */
    fun currentLesson(lessons: List<TimedLesson>, now: LocalDateTime): TimedLesson? =
        lessons.firstOrNull { it.isActiveAt(now) }

    /**
     * The next lesson that hasn't started yet. Searches every date in
     * the materialized list, so if today's schedule is over this
     * returns tomorrow's first lesson automatically. Returns null when
     * the materialized window has no future lessons — caller should
     * re-materialize with a wider end date if that happens.
     */
    fun nextLesson(lessons: List<TimedLesson>, now: LocalDateTime): TimedLesson? =
        lessons.firstOrNull { it.startDateTime.isAfter(now) }

    /** All lessons on a specific [date], sorted by start time. */
    fun lessonsForDate(lessons: List<TimedLesson>, date: LocalDate): List<TimedLesson> =
        lessons.filter { it.date == date }

    /**
     * The nearest school day ≥ [from] that has at least one lesson.
     * Returns null if no lessons exist in the materialized window.
     * Used by TodayScheduleWidget to auto-roll from a finished today
     * to the next day with actual classes.
     */
    fun nextSchoolDayWithLessons(
        lessons: List<TimedLesson>,
        from: LocalDate,
        inclusive: Boolean = true,
    ): LocalDate? = lessons
        .asSequence()
        .map { it.date }
        .distinct()
        .filter { d -> if (inclusive) !d.isBefore(from) else d.isAfter(from) }
        .minOrNull()

    /**
     * Which lessons on [date] are past / current / future relative to
     * [now]? Used by TodayScheduleWidget to render past classes dimmed.
     */
    fun classifyForDate(
        lessons: List<TimedLesson>,
        date: LocalDate,
        now: LocalDateTime,
    ): List<Classified> {
        val onDate = lessonsForDate(lessons, date)
        val isToday = date == now.toLocalDate()
        return onDate.map { l ->
            val state = when {
                !isToday                    -> LessonState.FUTURE
                l.isActiveAt(now)           -> LessonState.CURRENT
                l.isPastAt(now)             -> LessonState.PAST
                else                        -> LessonState.FUTURE
            }
            Classified(l, state)
        }
    }

    // ── Convenience: "materialize the useful window around now" ────

    /**
     * Materialize a rolling 14-day window starting at [today]. The
     * widgets and reminder scheduler all only need this window — a
     * wider one is wasted work.
     */
    fun materializeRollingWindow(
        entries: List<ScheduleEntry>,
        jaksot: List<Jakso>,
        today: LocalDate = LocalDate.now(),
        days: Int = 14,
    ): List<TimedLesson> = materialize(entries, jaksot, today, today.plusDays(days.toLong()))

    // ── Internals ──────────────────────────────────────────────────

    private fun parseHhmmOrNull(s: String): LocalTime? {
        val p = s.split(":")
        if (p.size != 2) return null
        val h = p[0].toIntOrNull() ?: return null
        val m = p[1].toIntOrNull() ?: return null
        if (h !in 0..23 || m !in 0..59) return null
        return LocalTime.of(h, m)
    }

    private fun parseIsoOrMax(s: String, fallback: LocalDate): LocalDate =
        try { LocalDate.parse(s) } catch (_: Throwable) { fallback }
}

enum class LessonState { PAST, CURRENT, FUTURE }

data class Classified(val lesson: TimedLesson, val state: LessonState)
