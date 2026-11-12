# ZervxHub Android app

Native Android starter for the app-first ZervxHub experience. API contracts and domain behavior are kept separate from Android-specific UI/storage so an iOS client can implement the same contract later.

## Requirements
- Android Studio, JDK 17, Android SDK 35
- Gradle 8.9 / Android Gradle Plugin 8.7.3

Open this directory in Android Studio and sync Gradle. Build with `gradle assembleDebug`. The Android CI workflow uploads a temporary `zervxhub-android-debug-apk` artifact after a successful build. Open the PR's Checks tab, open the Android app CI run, then download the artifact from the run's Artifacts section. The artifact is a debug build for testing, not a production release. Android may ask you to allow installation from the browser or file manager; only install APKs you downloaded from this repository's official Actions run. A Gradle wrapper is not committed yet; generate/manage it with Android Studio.

## API configuration
The API URL is intentionally empty until the verified Worker host and native session contract are approved. No credentials belong in committed Gradle properties. An empty URL keeps the app disconnected; no fake metrics or license records are shown.

## Security baseline
- Android 8.0+ (API 26) baseline.
- Cleartext traffic disabled; Android backup disabled.
- Session token helper uses AES-GCM with a non-exportable Android Keystore key.
- No API, Discord, payment, or Worker secrets are bundled.
- Release API configuration rejects non-HTTPS URLs and embedded credentials.
- Login/refresh is not wired until server-side session issuance, rotation, and revocation contracts are reviewed.
- API origin policy has unit tests for empty configuration, HTTPS enforcement, debug-only local HTTP, and rejection of embedded credentials/query/fragment.
- The app performs a credential-free `GET /v1/health` check when opened; it never treats API reachability as authentication and never displays fake account data.

## Planned modules
Home/account, projects, license/key management, activity/notifications, Developer Studio, device/session security.

## iOS portability
Keep API DTOs and domain use-cases platform-neutral. Android secure storage uses Android Keystore; a future iOS client must use Keychain. Do not assume Android device identifiers exist on iOS.
