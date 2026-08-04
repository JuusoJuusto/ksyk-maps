package fi.ksykmaps.ui

/**
 * One-shot nav intent for the Map screen.
 *
 * Set `pendingRoomId` before calling `navigate("map")` from anywhere in
 * the app (typically the Room finder). The MapScreen reads and clears
 * the field on its next LaunchedEffect, animates the camera to the
 * room's centroid, and opens the room bottom sheet.
 *
 * Not a StateFlow — this is deliberately fire-and-forget so the same
 * room-id doesn't re-trigger if the user navigates away and back later.
 */
object MapNavIntent {
    /** Consumed once by MapScreen. Cleared after use. */
    var pendingRoomId: String? = null
}
