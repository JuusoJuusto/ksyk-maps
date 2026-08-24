package fi.ksykmaps.data

import android.os.Build
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant

/**
 * Fire-and-forget analytics client. Every event is sent to /api/analytics-event
 * in the background; failures are silently swallowed so analytics can never
 * crash or slow down the app.
 *
 * Call sites use the typed helpers (trackBuildingSearch, trackError, …) so the
 * event schema stays consistent without boilerplate at every call site.
 */
object Analytics {
    private val scope = CoroutineScope(Dispatchers.IO)

    fun trackBuildingSearch(query: String, resultCount: Int) =
        fire("building_search", "q" to query, "results" to resultCount.toString())

    fun trackRoomView(roomId: String, roomNumber: String, building: String = "") =
        fire("room_view", "id" to roomId, "num" to roomNumber, "building" to building)

    fun trackBuildingOpen(buildingId: String, buildingName: String) =
        fire("building_open", "id" to buildingId, "name" to buildingName)

    fun trackTabSwitch(tab: String) =
        fire("tab_switch", "tab" to tab)

    fun trackError(screen: String, message: String) =
        fire("app_error", "screen" to screen, "msg" to message.take(200))

    fun trackEasterEgg(name: String) =
        fire("easter_egg", "name" to name)

    fun trackLunchView(day: String) =
        fire("lunch_view", "day" to day)

    fun trackMapAction(action: String) =
        fire("map_action", "action" to action)

    private fun fire(event: String, vararg props: Pair<String, String>) {
        scope.launch {
            try {
                val body = buildJsonObject {
                    put("event", event)
                    put("platform", "android")
                    put("sdkVersion", Build.VERSION.SDK_INT)
                    put("ts", Instant.now().epochSecond)
                    props.forEach { (k, v) -> put(k, v) }
                }
                Api.post("/analytics-event", body)
            } catch (_: Exception) {
                // Analytics must never crash or block the app — swallow silently.
            }
        }
    }
}
