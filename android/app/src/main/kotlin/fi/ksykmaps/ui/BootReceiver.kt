package fi.ksykmaps.ui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != "android.intent.action.QUICKBOOT_POWERON") return

        // Re-schedule timetable reminders after device reboot.
        // AlarmManager clears all alarms on reboot; without this, notifications
        // stop firing until the user opens the app and saves entries again.
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val entries = loadEntries(context)
                if (entries.isNotEmpty()) {
                    LessonReminderScheduler.schedule(context, entries)
                }
            } catch (_: Exception) { /* non-critical */ }
        }
    }
}
