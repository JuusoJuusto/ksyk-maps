/*
 * PostHog Android shim (admin subproject copy). See the app/ copy for
 * the full rationale. Kept in-sync so both modules compile without the
 * real posthog-android SDK.
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

class PostHogStub {
    fun capture(event: String, properties: Map<String, Any?> = emptyMap()) { /* no-op */ }
    fun identify(distinctId: String, properties: Map<String, Any?> = emptyMap()) { /* no-op */ }
    fun reset() { /* no-op */ }
}
