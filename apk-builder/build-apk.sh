#!/bin/bash
set -e

# ========== Configuration ==========
ANDROID_HOME=/home/admin/android-sdk
BUILD_TOOLS=$ANDROID_HOME/build-tools/34.0.0
PLATFORM=$ANDROID_HOME/platforms/android-34
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-17.0.18.0.8-1.0.2.1.al8.x86_64
PROJECT=/home/admin/eszf-app/apk-builder
OUTPUT=$PROJECT/build

echo "=== 1. Clean ==="
rm -rf $OUTPUT
mkdir -p $OUTPUT

echo "=== 2. Compile resources ==="
$BUILD_TOOLS/aapt2 compile \
  -o $OUTPUT/res.zip \
  --dir $PROJECT/app/src/main/res

echo "=== 3. Link resources + generate R.java ==="
$BUILD_TOOLS/aapt2 link \
  -o $OUTPUT/app-unsigned.apk \
  -I $PLATFORM/android.jar \
  --manifest $PROJECT/app/src/main/AndroidManifest.xml \
  -R $OUTPUT/res.zip \
  --java $OUTPUT/gen \
  --auto-add-overlay

echo "=== 4. Fix manifest in APK ==="
cd $OUTPUT
# AAPT2 creates APK with resources, we need to add the manifest in proper format
# Actually aapt2 link already includes the manifest in binary format in the APK
cd $PROJECT

echo "=== 5. Compile Java ==="
mkdir -p $OUTPUT/classes
$JAVA_HOME/bin/javac \
  -d $OUTPUT/classes \
  -classpath $PLATFORM/android.jar:$OUTPUT/gen \
  -source 11 -target 11 \
  $PROJECT/app/src/main/java/com/eszf/app/MainActivity.java

echo "=== 6. Convert to DEX ==="
mkdir -p $OUTPUT/dex
$BUILD_TOOLS/d8 \
  --lib $PLATFORM/android.jar \
  --output $OUTPUT/dex \
  $(find $OUTPUT/classes -name "*.class")

echo "=== 7. Add DEX to APK ==="
cd $OUTPUT/dex
zip -q $OUTPUT/app-unsigned.apk classes.dex 2>/dev/null || true
cd $PROJECT

echo "=== 8. Generate keystore ==="
keytool -genkey -v \
  -keystore $OUTPUT/debug.keystore \
  -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass android -keypass android \
  -dname "CN=Android Debug, O=Android, C=US" 2>/dev/null || true

echo "=== 9. Sign APK ==="
$BUILD_TOOLS/apksigner sign \
  --ks $OUTPUT/debug.keystore \
  --ks-pass pass:android \
  --ks-key-alias androiddebugkey \
  --key-pass pass:android \
  --out $OUTPUT/app-debug.apk \
  $OUTPUT/app-unsigned.apk

echo "=== 10. Verify ==="
$BUILD_TOOLS/apksigner verify $OUTPUT/app-debug.apk
echo ""

ls -lh $OUTPUT/app-debug.apk
echo ""
echo "SUCCESS! APK at: $OUTPUT/app-debug.apk"
