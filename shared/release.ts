/**
 * The Android release the website offers. One constant, three readers: the
 * /download page, the build-time prerender (which refuses to build when the
 * APK is missing) and the permanent /api/download/android link. Bump it in the
 * same commit that adds public/releases/ksykmaps-release-<version>.apk.
 */
export const ANDROID_APP_VERSION = "1.3.0";

/** Lowest Android version the APK installs on (minSdk 26 = Android 8.0). */
export const ANDROID_MIN_VERSION = "8.0";

export const apkPath = (version: string = ANDROID_APP_VERSION): string =>
  `/releases/ksykmaps-release-${version}.apk`;
