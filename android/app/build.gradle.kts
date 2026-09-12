import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "fi.ksykmaps"
    compileSdk = 34

    defaultConfig {
        applicationId = "fi.ksykmaps"
        minSdk = 26
        targetSdk = 34
        versionCode = 61
        versionName = "1.59.0"

        // Vercel Attack Challenge Mode bypass — the API client sends this
        // as `x-vercel-protection-bypass` and `x-ksyk-bypass-token`. Add a
        // matching Vercel WAF Custom Rule → Skip Attack Challenge when
        // request header `x-ksyk-bypass-token` equals this value, and set
        // env var VERCEL_AUTOMATION_BYPASS_SECRET to the same string.
        // Override at build time with:
        //   ORG_GRADLE_PROJECT_ksykBypassToken=<secret> ./gradlew assembleRelease
        val bypassToken = System.getenv("KSYK_BYPASS_TOKEN")
            ?: (project.findProperty("ksykBypassToken") as? String)
            ?: "ksyk-mobile-2b9d47f83c6e5a1"
        buildConfigField("String", "BYPASS_TOKEN", "\"$bypassToken\"")

        val projectEnv = Properties().apply {
            rootProject.projectDir.parentFile.resolve(".env").takeIf { it.isFile }
                ?.inputStream()?.use { load(it) }
        }
        val posthogApiKey = System.getenv("POSTHOG_API_KEY") ?: projectEnv.getProperty("POSTHOG_API_KEY")
        val posthogHost = System.getenv("POSTHOG_HOST") ?: projectEnv.getProperty("POSTHOG_HOST")
        buildConfigField("String", "POSTHOG_API_KEY", posthogApiKey?.let { "\"${it.replace("\\", "\\\\").replace("\"", "\\\"")}\"" } ?: "null")
        buildConfigField("String", "POSTHOG_HOST", posthogHost?.let { "\"${it.replace("\\", "\\\\").replace("\"", "\\\"")}\"" } ?: "null")

        // Sentry Android — override with SENTRY_DSN env var or sentry.dsn in .env
        val sentryDsn = System.getenv("SENTRY_DSN")
            ?: (project.findProperty("sentryDsn") as? String)
            ?: projectEnv.getProperty("SENTRY_DSN")
            ?: "https://265057853851f81798b8f01ebb2c236a@o4512001020133376.ingest.de.sentry.io/4512012645302352"
        buildConfigField("String", "SENTRY_DSN", "\"${sentryDsn.replace("\\", "\\\\").replace("\"", "\\\"")}\"")

    }

    buildFeatures { compose = true; buildConfig = true }
    composeOptions { kotlinCompilerExtensionVersion = "1.5.8" }

    signingConfigs {
        create("release") {
            // Stand-in self-signed keystore so we can ship a release APK
            // from a clean machine. For Play Store distribution swap to the
            // production keystore via env vars (KSYK_KEYSTORE_FILE etc).
            val ksFile = System.getenv("KSYK_KEYSTORE_FILE") ?: "ksyk-release.jks"
            val ksPath = file(ksFile)
            if (ksPath.exists()) {
                storeFile = ksPath
                storePassword = System.getenv("KSYK_KEYSTORE_PASSWORD") ?: "ksyk1234"
                keyAlias = System.getenv("KSYK_KEY_ALIAS") ?: "ksyk"
                keyPassword = System.getenv("KSYK_KEY_PASSWORD") ?: "ksyk1234"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false   // Keep symbols readable; turn on for store builds.
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            val ksFile = file(System.getenv("KSYK_KEYSTORE_FILE") ?: "ksyk-release.jks")
            if (ksFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    // Rename output APKs to ksykmaps-<variant>-<versionName>.apk
    applicationVariants.all {
        val variant = this
        variant.outputs.all {
            val output = this as com.android.build.gradle.internal.api.BaseVariantOutputImpl
            output.outputFileName = "ksykmaps-${variant.buildType.name}-${variant.versionName}.apk"
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // Backport java.time.* to API 26+ minSdk. Without this
        // LocalDate.parse crashes on real devices below API 26 even
        // though our minSdk = 26 — it's a compiler soft-guard.
        isCoreLibraryDesugaringEnabled = true
    }
    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf("-Xskip-metadata-version-check")
    }
}

dependencies {
    val compose = "1.6.0"

    implementation("com.posthog:posthog-android:3.+")
    implementation("io.sentry:sentry-android:8.+")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")
    implementation("androidx.compose.ui:ui:$compose")
    implementation("androidx.compose.ui:ui-tooling-preview:$compose")
    implementation("androidx.compose.material3:material3:1.3.0")
    implementation("androidx.compose.material:material-icons-extended:$compose")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Chrome Custom Tabs — for mpassId OAuth (NOT WebView)
    implementation("androidx.browser:browser:1.8.0")

    // Network
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")

    // Location + maps
    implementation("com.google.android.gms:play-services-location:21.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // MapLibre Native — native OpenGL vector/raster renderer for Android.
    // Mirrors what CampusMap.tsx uses on the web (MapLibre GL JS), so the
    // same OpenStreetMap-derived styles/tile URLs work on both platforms.
    // Ships prebuilt .so binaries for arm64-v8a, armeabi-v7a, x86, x86_64.
    implementation("org.maplibre.gl:android-sdk:11.5.2")
    implementation("org.maplibre.gl:android-plugin-annotation-v9:3.0.1")

    // Background work — periodic announcement poll for push-style
    // notifications (no FCM). WorkManager handles Doze / battery
    // optimisation for us.
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    // Storage
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    // Persist API responses to disk so the app opens offline. We use a
    // handful of small JSON blobs (buildings, rooms, announcements) via
    // simple files under filesDir — no need for a full Room database.

    debugImplementation("androidx.compose.ui:ui-tooling:$compose")

    // Backport for java.time.* — activated by isCoreLibraryDesugaringEnabled above.
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")
}
