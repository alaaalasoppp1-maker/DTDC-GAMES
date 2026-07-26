plugins {
    id("com.android.application")
}

android {
    namespace = "com.dentalchain.games"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.dentalchain.games"
        minSdk = 26
        targetSdk = 34
        versionCode = 20
        versionName = "2.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
}
