package fi.ksykmaps.admin

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class KsykAdminApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(
                NotificationChannel(
                    "admin_alerts",
                    "Admin Alerts",
                    NotificationManager.IMPORTANCE_DEFAULT,
                ).apply { description = "KSYK Maps Admin alerts and notifications" }
            )
        }
    }
}
