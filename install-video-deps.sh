#!/bin/bash

echo "🎬 Installing Video Player Dependencies for Phase 6..."

# Install required packages
echo "📦 Installing react-native-video..."
npm install react-native-video

echo "📦 Installing slider component..."
npm install @react-native-community/slider

echo "🧹 Cleaning Android build..."
cd android && ./gradlew clean && cd ..

echo "✅ Dependencies installed! You can now:"
echo "1. npm start (if not running)"
echo "2. npx react-native run-android"
echo "3. Test video download first"
echo "4. Test video player by pressing downloaded video cards"

echo ""
echo "🚀 Phase 6 Video Player is ready to test!"
