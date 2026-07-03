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
        versionCode = 1
        versionName = "1.0.0"
    }

    buildFeatures { compose = true }
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
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // Backport java.time.* to API 26+ minSdk. Without this
        // LocalDate.parse crashes on real devices below API 26 even
        // though our minSdk = 26 — it's a compiler soft-guard.
        isCoreLibraryDesugaringEnabled = true
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    val compose = "1.6.0"
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.compose.ui:ui:$compose")
    implementation("androidx.compose.ui:ui-tooling-preview:$compose")
    implementation("androidx.compose.material3:material3:1.3.0")
    implementation("androidx.compose.material:material-icons-extended:$compose")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Network
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")

    // Location + maps
    implementation("com.google.android.gms:play-services-location:21.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")

    // Storage
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    debugImplementation("androidx.compose.ui:ui-tooling:$compose")

    // Backport for java.time.* — activated by isCoreLibraryDesugaringEnabled above.
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")
}
