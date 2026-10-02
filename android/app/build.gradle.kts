plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.example.webviewsample"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.webviewsample"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    // 푸시 수신 (FCM)
    // ⚠️ 실제 푸시를 받으려면 Firebase 콘솔의 google-services.json을 app/ 에 추가하고
    //    아래 google-services 플러그인을 활성화해야 합니다.
    //    - 루트 build.gradle.kts: id("com.google.gms.google-services") version "4.4.2" apply false
    //    - 이 파일 plugins 블록:   id("com.google.gms.google-services")
    implementation("com.google.firebase:firebase-messaging:24.0.0")
}
