package fi.ksykmaps.ui

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import fi.ksykmaps.KsykApp
import fi.ksykmaps.MainActivity
import fi.ksykmaps.data.Api
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import java.util.concurrent.TimeUnit

/**
 * Polls /api/announcements every 15 minutes (the minimum WorkManager
 * period). When a new announcement id shows up that we haven't already
 * notified about, we fire a system notification. State is kept in
 * SharedPreferences ("ksyk_announcements") so we don't notify twice.
 *
 * This replaces FCM for us — no push server, no Google Services
 * dependency, works offline-first (skips silently on failure).
 */
class AnnouncementPollWorker(
    ctx: Context,
    params: WorkerParameters,
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        try {
            val json = Api.get("/announcements")
            val arr = json.jsonArray.mapNotNull { it as? JsonObject }
            val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val seen = prefs.getStringSet(KEY_SEEN, emptySet())?.toMutableSet() ?: mutableSetOf()

            // First-ever run: mark everything current as seen so we don't
            // spam the user with weeks of old announcements. Notifications
            // start from the NEXT new item.
            val firstRun = !prefs.getBoolean(KEY_INITIALISED, false)
            if (firstRun) {
                arr.forEach { a -> (a["id"] as? JsonPrimitive)?.contentOrNull?.let { seen.add(it) } }
                prefs.edit()
                    .putStringSet(KEY_SEEN, seen)
                    .putBoolean(KEY_INITIALISED, true)
                    .apply()
                return Result.success()
            }

            val newOnes = arr.mapNotNull { a ->
                val id = (a["id"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null
                if (id in seen) null else Pair(id, a)
            }
            if (newOnes.isEmpty()) return Result.success()

            newOnes.forEach { (id, a) ->
                showNotification(ctx, a)
                seen.add(id)
            }
            prefs.edit().putStringSet(KEY_SEEN, seen).apply()
            return Result.success()
        } catch (_: Throwable) {
            // Network / API error — retry next tick.
            return Result.retry()
        }
    }

    private fun showNotification(ctx: Context, a: JsonObject) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ActivityCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) return

        val title = (a["title"] as? JsonPrimitive)?.contentOrNull ?: "KSYK Maps"
        val body = ((a["content"] as? JsonPrimitive)?.contentOrNull
            ?: (a["body"] as? JsonPrimitive)?.contentOrNull ?: "")
        val type = (a["type"] as? JsonPrimitive)?.contentOrNull ?: "info"
        val priority = when (type.lowercase()) {
            "urgent" -> NotificationCompat.PRIORITY_HIGH
            "warning" -> NotificationCompat.PRIORITY_HIGH
            else -> NotificationCompat.PRIORITY_DEFAULT
        }

        val tapPi = PendingIntent.getActivity(
            ctx, 0,
            Intent(ctx, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("open_tab", "news")
            },
            PendingIntent.FLAG_IMMUTABLE,
        )

        val notif = NotificationCompat.Builder(ctx, KsykApp.CHANNEL_GENERAL)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title)
            .setContentText(body.take(80))
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(priority)
            .setContentIntent(tapPi)
            .setAutoCancel(true)
            .build()

        val idHash = ((a["id"] as? JsonPrimitive)?.contentOrNull ?: "").hashCode()
        NotificationManagerCompat.from(ctx).notify(2000 + (idHash and 0x7FFF), notif)
    }

    companion object {
        private const val PREFS = "ksyk_announcements"
        private const val KEY_SEEN = "seen_ids"
        private const val KEY_INITIALISED = "initialised"
        private const val WORK_NAME = "announcement_poll"

        fun enqueue(ctx: Context) {
            val request = PeriodicWorkRequestBuilder<AnnouncementPollWorker>(
                15, TimeUnit.MINUTES,
            ).build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }
    }
}
