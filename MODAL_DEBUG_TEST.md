# 🧪 Quick Modal Debug Test

## Test Button (Temporary - For Debugging Only)

Add this button temporarily to `VideoListNew.js` to manually test the modal hide functionality:

### Step 1: Add Test Button

Add this inside the return statement of `VideoListNew.js` (around line 550):

```javascript
// Add after {renderVideoList()} and before the bottom warning
{
  __DEV__ && (
    <View
      style={{
        position: 'absolute',
        top: 100,
        right: 20,
        backgroundColor: 'red',
        padding: 10,
        borderRadius: 8,
        zIndex: 9999,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          const currentState = AppStore.getState();
          const { videosWithStatus } = currentState.videosStore;
          const { downloadingProcessModal } = currentState.modalStore;

          console.log('========== DEBUG STATE CHECK ==========');
          console.log('Modal visible:', downloadingProcessModal.visible);
          console.log('Modal state:', downloadingProcessModal);

          const pending = videosWithStatus.filter(
            v =>
              v.status === 'NEW' ||
              v.status === 'FAILED' ||
              v.status === 'DOWNLOADING',
          );
          console.log('Pending videos:', pending.length);
          console.log('Pending details:', pending);

          const downloaded = videosWithStatus.filter(
            v => v.status === 'DOWNLOADED',
          );
          console.log('Downloaded videos:', downloaded.length);
          console.log('======================================');
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>DEBUG STATE</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          console.log('🚫 FORCE HIDING MODAL (DEBUG)');
          dispatch(hideDownloadingProcessModal());
          dispatch(setDownloadingInModal(false));
          dispatch(resetDownloadTracking());
        }}
        style={{ marginTop: 10 }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>FORCE HIDE</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Step 2: Test Flow

1. **During downloads**, tap "DEBUG STATE" button

   - Should show pending videos count > 0
   - Modal should be visible: true

2. **After all downloads**, tap "DEBUG STATE" button again

   - Should show pending videos count = 0
   - Modal should be visible: false (if working correctly)

3. **If modal won't hide**, tap "FORCE HIDE" button
   - This manually hides the modal
   - If this works, it confirms Redux is working
   - Problem is in the auto-hide logic

### Step 3: Analyze Results

#### ✅ **If FORCE HIDE works:**

- Redux connection is fine
- Issue is in the completion detection logic
- Check these logs:
  - `[VideoListNew] ⏳ PENDING: X` (should be 0)
  - `[VideoListNew] ✨ ALL DOWNLOADS COMPLETE!` (should appear)

#### ❌ **If FORCE HIDE doesn't work:**

- Redux store issue
- Check Redux DevTools or add more logging
- Verify modalSlice is registered in store.js

---

## Alternative: Metro Console Commands

You can also check state directly in Metro terminal:

### Get Current State

```javascript
// Add this temporarily at the top of VideoListNew.js
global.getModalState = () => {
  const state = AppStore.getState();
  console.log('Modal State:', state.modalStore.downloadingProcessModal);
  return state.modalStore.downloadingProcessModal;
};

global.getVideosState = () => {
  const state = AppStore.getState();
  const videos = state.videosStore.videosWithStatus;
  const pending = videos.filter(
    v =>
      v.status === 'NEW' || v.status === 'FAILED' || v.status === 'DOWNLOADING',
  );
  console.log('Total videos:', videos.length);
  console.log('Pending:', pending.length);
  console.log(
    'Downloaded:',
    videos.filter(v => v.status === 'DOWNLOADED').length,
  );
  return { total: videos.length, pending: pending.length };
};

global.hideModal = () => {
  const {
    hideDownloadingProcessModal,
  } = require('./App/Features/Modal/modalSlice');
  AppStore.dispatch(hideDownloadingProcessModal());
  console.log('Modal hidden');
};
```

Then in Metro terminal, type:

```
getModalState()
getVideosState()
hideModal()
```

---

## Quick Verification Checklist

After downloads complete, verify these in console logs:

- [ ] See `[VideoListNew] ✨ ALL DOWNLOADS COMPLETE!`
- [ ] See `[VideoListNew] 🚫 Dispatching hideDownloadingProcessModal...`
- [ ] See `[ModalSlice] 🚫 HIDING downloading process modal - AFTER: { visible: false }`
- [ ] See `[DownloadingProcessModal] ❌ Modal is HIDDEN - returning null`

**If ANY of these are missing**, that's where the flow breaks!

---

## Common Scenarios

### Scenario A: Modal stuck showing "6/6"

```
[VideoListNew] ✅ DOWNLOADED: 6
[VideoListNew] ⏳ PENDING: 0
[VideoListNew] ✨ ALL DOWNLOADS COMPLETE!
[VideoListNew] 🚫 Dispatching hideDownloadingProcessModal...
(Modal still visible)
```

**Issue**: Redux dispatch not reaching modalSlice
**Fix**: Check store.js configuration

---

### Scenario B: Modal never reaches "ALL DOWNLOADS COMPLETE"

```
[VideoListNew] ✅ DOWNLOADED: 5
[VideoListNew] ⏳ PENDING: 1
[VideoListNew] ⚠️ Still have pending videos
```

**Issue**: One video stuck in non-DOWNLOADED state
**Fix**: Check DownloadManager status updates for that video

---

### Scenario C: Modal hides then shows again

```
[VideoListNew] ✨ ALL DOWNLOADS COMPLETE!
[ModalSlice] 🚫 HIDING downloading process modal
(2 seconds later)
[VideoListNew] Starting download for 1 videos
[ModalSlice] Showing downloading process modal
```

**Issue**: New download triggered (this is CORRECT behavior!)
**Fix**: This is actually working as intended - new videos detected

---

## Remove Debug Code After Testing

Once you've identified the issue, **remove**:

- The debug buttons (keep only in development with `__DEV__`)
- The `global.` functions
- Extra console.logs (keep only essential ones)

The core logging in the main code is useful to keep!
