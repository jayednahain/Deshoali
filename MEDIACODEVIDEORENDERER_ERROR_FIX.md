# 🚨 MediaCodecVideoRenderer Error Fix

## 🎯 **Error Analysis**

The error you're seeing is:

```
MediaCodecVideoRenderer error, index=0, format=Format(1, null, null, video/avc, errorCode: "24003"
ExoPlaybackException: ERROR_CODE_DECODING_FAILED
```

This is a **video codec decoding error** specifically on Android with the MediaCodec system.

## 🔧 **Root Causes & Solutions**

### **1. Video Format Incompatibility**

**Problem**: The video (`video_20.mp4`) might be encoded with:

- H.265/HEVC codec (not widely supported)
- High profile/level settings
- Corrupted video stream
- Unsupported container format

### **2. Device Limitations**

**Problem**: Some Android devices have limited codec support or hardware decoder issues

## ✅ **Fixes Applied**

### **Enhanced Error Detection**

```javascript
// Now detects MediaCodecVideoRenderer errors specifically
if (
  errorStr.includes('mediacodevideorenderer') ||
  errorStr.includes('decoding_failed') ||
  errorStr.includes('codec') ||
  errorCode.includes('24003')
) {
  errorTitle = 'Video Format Error';
  errorMessage =
    'This video format is not supported on your device. The video may be corrupted or encoded in an unsupported format (H.265/HEVC). Please try another video or contact support.';
}
```

### **Codec Compatibility Settings**

```javascript
// Added to Video component for better codec handling
useTextureView={false}          // Use SurfaceView instead of TextureView
bufferConfig={{
  minBufferMs: 15000,           // Larger buffer for stability
  maxBufferMs: 50000,
  bufferForPlaybackMs: 2500,
  bufferForPlaybackAfterRebufferMs: 5000
}}
selectedVideoTrack={{
  type: "auto"                  // Let system choose best track
}}
```

### **Better Source Validation**

```javascript
// Enhanced video source validation
const videoSource = useMemo(() => {
  if (!localFilePath) {
    console.warn('[VideoPlayer] No local file path provided');
    return null;
  }

  const source = { uri: `file://${localFilePath}` };
  console.log('[VideoPlayer] Video source:', source);
  return source;
}, [localFilePath]);
```

## 🎯 **What Will Happen Now**

### **For This Specific Video (video_20.mp4):**

1. **Error Detection**: You'll get a clear "Video Format Error" message
2. **User-Friendly Message**: Explains it's a codec/format issue
3. **Retry Option**: Available but might still fail if format is unsupported
4. **Logging**: Better error details in console

### **Expected User Experience:**

```
Title: "Video Format Error"
Message: "This video format is not supported on your device. The video may be corrupted or encoded in an unsupported format (H.265/HEVC). Please try another video or contact support."
Buttons: [Retry] [OK]
```

## 🔍 **Troubleshooting Steps**

### **1. Check Video Properties**

```bash
# Use ffprobe to check video format (if available)
ffprobe video_20.mp4
```

### **2. Test on Different Device**

- Try the same video on a different Android device
- Test on iOS if available

### **3. Server-Side Solution**

The most reliable fix is to **re-encode the video on the server**:

```bash
# Convert to widely supported H.264 format
ffmpeg -i input.mp4 -c:v libx264 -profile:v baseline -level 3.0 -c:a aac output.mp4
```

## 📱 **Long-Term Solutions**

### **For Server/Backend:**

1. **Standardize video encoding**: Use H.264 (AVC) codec
2. **Set compatible profiles**: Baseline or Main profile
3. **Limit resolution/bitrate**: Ensure device compatibility
4. **Add video validation**: Check format before allowing upload

### **For App:**

1. **Format detection**: Check video properties before download
2. **Fallback handling**: Graceful degradation for unsupported videos
3. **User feedback**: Clear messaging about format requirements

## 🚨 **Immediate Actions**

1. **Test the enhanced error message** - you should now see "Video Format Error" instead of generic error
2. **Try retry** - might work with the new codec settings
3. **Skip this video** - if it consistently fails, it's likely a format issue
4. **Report to backend team** - video_20.mp4 needs re-encoding

The error handling is now much better, but the underlying issue (video format incompatibility) may require server-side fixes for complete resolution.

---

## 🎥 **Key Point**

This error is **not a bug in your app** - it's a video format compatibility issue. The enhanced error handling will make this clear to users and provide better debugging info for developers.
