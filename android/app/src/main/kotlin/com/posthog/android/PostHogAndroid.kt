/*
 * PostHog Android shim — matches the surface area used by the KSYK Maps
 * codebase without depending on the real posthog-android SDK.
 *
 * Why this exists: the PostHog setup wizard sprayed call sites like
 * `PostHogAndroid.getInstance().capture(...)` across the app. Later
 * releases of posthog-android:3.+ ship Kotlin 2.1 stdlib metadata that
 * our Kotlin 1.9 toolchain cannot read, and older releases don't have
 * the `getInstance()` API the wizard emits. Rather than rewrite every
 * call site or upgrade the whole Kotlin toolchain, we keep an internal
 * no-op stub. Our first-party pipeline (fi.ksykmaps.data.Analytics
 * → /api/session/heartbeat → Postgres) covers the analytics per spec.
 *
 * Drop this file (and the matching one under admin/) once the project
 * upgrades to Kotlin 2.x and can pull the real SDK back in.
 */
package com.posthog.android

class PostHogAndroidConfig(
    val apiKey: String,
    val host: String,
) {
    val errorTrackingConfig = ErrorTrackingConfig()
    class ErrorTrackingConfig { var autoCapture: Boolean = false }
}

object PostHogAndroid {
    private val stub = PostHogStub()
    fun setup(context: Any, config: PostHogAndroidConfig) { /* no-op */ }
    fun getInstance(): PostHogStub = stub
}

/**
 * Instance the real SDK returns from `getInstance()`. Every method is
 * a fire-and-forget no-op — call sites already wrap us in runCatching{}.
 */
class PostHogStub {
    fun capture(event: String, properties: Map<String, Any?> = emptyMap()) { /* no-op */ }
    fun identify(distinctId: String, properties: Map<String, Any?> = emptyMap()) { /* no-op */ }
    fun reset() { /* no-op */ }
}
