#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ANDROID_JAR="${ANDROID_JAR:-${1:-}}"
BUILD_TOOLS="${BUILD_TOOLS:-${2:-}}"

if [[ -z "$ANDROID_JAR" && -n "${ANDROID_SDK_ROOT:-}" ]]; then
  ANDROID_JAR="$ANDROID_SDK_ROOT/platforms/android-34/android.jar"
fi
if [[ -z "$BUILD_TOOLS" && -n "${ANDROID_SDK_ROOT:-}" ]]; then
  BUILD_TOOLS="$ANDROID_SDK_ROOT/build-tools/34.0.0"
fi
if [[ ! -f "$ANDROID_JAR" ]]; then
  echo "android.jar not found. Pass it as the first argument or set ANDROID_JAR." >&2
  exit 2
fi
if [[ ! -x "$BUILD_TOOLS/aapt2" || ! -x "$BUILD_TOOLS/d8" || ! -x "$BUILD_TOOLS/zipalign" || ! -x "$BUILD_TOOLS/apksigner" ]]; then
  echo "Android build-tools not found. Pass their directory as the second argument or set BUILD_TOOLS." >&2
  exit 2
fi
if [[ ! -f "$ROOT/tools/ecj.jar" ]]; then
  echo "tools/ecj.jar is missing." >&2
  exit 2
fi

BUILD="$ROOT/build/local"
OUT="$ROOT/dist"
KEYSTORE="$ROOT/signing/dtdc-games-test.p12"
rm -rf "$BUILD"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$OUT" "$ROOT/signing"

"$BUILD_TOOLS/aapt2" compile \
  --dir "$ROOT/app/src/main/res" \
  -o "$BUILD/resources.zip"

"$BUILD_TOOLS/aapt2" link \
  -o "$BUILD/resources.apk" \
  --manifest "$ROOT/app/src/main/AndroidManifest.xml" \
  -I "$ANDROID_JAR" \
  -A "$ROOT/app/src/main/assets" \
  --min-sdk-version 26 \
  --target-sdk-version 34 \
  --version-code 20 \
  --version-name 2.0.0 \
  "$BUILD/resources.zip"

mapfile -t JAVA_SOURCES < <(find "$ROOT/app/src/main/java" -type f -name '*.java' -print | sort)
java -jar "$ROOT/tools/ecj.jar" \
  -proc:none -g -encoding UTF-8 -source 1.8 -target 1.8 \
  -bootclasspath "$ANDROID_JAR" \
  -d "$BUILD/classes" \
  "${JAVA_SOURCES[@]}"

mapfile -t CLASS_FILES < <(find "$BUILD/classes" -type f -name '*.class' -print | sort)
"$BUILD_TOOLS/d8" \
  --lib "$ANDROID_JAR" \
  --min-api 26 \
  --output "$BUILD/dex" \
  "${CLASS_FILES[@]}"

cp "$BUILD/resources.apk" "$BUILD/unsigned.apk"
(cd "$BUILD/dex" && zip -q -j "$BUILD/unsigned.apk" classes.dex)
"$BUILD_TOOLS/zipalign" -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"

if [[ ! -f "$KEYSTORE" ]]; then
  keytool -genkeypair -noprompt \
    -keystore "$KEYSTORE" -storetype PKCS12 \
    -storepass dtdcgames -keypass dtdcgames \
    -alias dtdc-games -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=DTDC GAMES, OU=DTDC, O=Dental Chain, L=Local, C=NL" >/dev/null 2>&1
fi

FINAL="$OUT/DTDC_GAMES_v2.0.0.apk"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:dtdcgames \
  --key-pass pass:dtdcgames \
  --out "$FINAL" \
  "$BUILD/aligned.apk"

"$BUILD_TOOLS/apksigner" verify --verbose --print-certs "$FINAL"
echo "Built: $FINAL"
