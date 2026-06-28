package fi.ksykmaps

import android.app.Application

/**
 * Application singleton. Holds the in-memory session + the OkHttp client
 * used by every screen so we don't pay the socket-setup cost on every
 * navigate.
 */
class KsykApp : Application() {
    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: KsykApp
            private set
    }
}
