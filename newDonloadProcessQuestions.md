# Video Download Feature - Requirements Documentation

## Components to Create

### 1. DownloadingProcess Modal

- **Purpose:** Shows download progress for videos
- **Specifications:**
  - **Title:** "ডাউনলোড হচ্ছে"
  - **Description/Warning:**

```
    ইন্টারনেট সংযোগ চালু রাখুন!
    অনুগ্রহ পূর্বক মোবাইল এপ কার্যক্রম চালু রাখুন!
```

- **Display Elements:**
  - Download progress for current single file
  - Total number of files to be downloaded
  - Total files already downloaded (format: "7/9")
  - Current downloading video title
- **Behavior:**
  - No hide/close button (cannot be dismissed by user)

### 2. CustomLoader Component

- **Purpose:** Full-screen loading indicator
- **Specifications:**
  - Full-screen overlay
  - Transparent background with opacity
  - Uses `<ActivityIndicator size="large" color="#00ff00" />`
  - Shows over existing content
  - Component name: `<CustomLoader/>`

### 3. CustomErrorModal

- **Purpose:** Display errors during download/process
- **Specifications:**
  - **Retry Button:** "আবার চেষ্ট্রা করুন"
    - `onPress` handler defined in parent component
  - **Cancel Button:** Hides the modal
  - Shows when any download/process error occurs

---

## Functionality Flow

### On App Open

#### Step 1: Memory Check

- Perform device memory check (existing functionality)

#### Step 2: Internet Check

- Perform internet connection check (existing functionality)

##### If NO Internet:

1. Show `<CustomLoader/>`
2. Load downloaded videos from device storage
3. Hide loader after loading complete

##### If Internet Available:

1. Show `<CustomLoader/>`
2. Call API
3. Render data behind the loader
4. Hide `<CustomLoader/>` after data loads properly
5. Show **DownloadingProcess Modal**

// smpliy app open process

- on component mount i mean initialize `<CustomLoader/>` will start
  behind the see we will prepare our data
  in the meantime we 1st memory check , if memory check is ok , then move the internet , if internet in ok ,
  then call the api ,
  if we get the success response:
  - hide the <CustomLoader/> model
  - then show the DownloadingProcess Modal if there is any item we arent downloaded yet
  - if all the files are downloaded user are now free to use
    if we get the error response:(1st time after app open);
  - we will hide the CustomErrorModal
    - on this this time there will not cancel button on CustomErrorModal
      - instead of showing chanel button we will show "ডাউনলোড করা ভিডিও দেখুন "
        - if user press on "ডাউনলোড করা ভিডিও দেখুন "
          - then <CustomLoader/> will show
          - hide after all the videos been render
    - if user press try again on CustomErrorModal
      - <CustomLoader/> will show
        - api call
          - get response again

---

### Download Process (Inside DownloadingProcess Modal)

#### Normal Flow:

- All data processing/downloading happens inside the modal
- Display current file being downloaded
- Update progress indicators

#### Error Handling:

When any error occurs (internet issue, URL issue, download failure, etc.):

1. Hide **DownloadingProcess Modal**
2. Show **CustomErrorModal**

**On User Actions:**

- **"আবার চেষ্ট্রা করুন" pressed:**

  1. Show `<CustomLoader/>`
  2. Call API again
  3. Hide loader
  4. Show **DownloadingProcess Modal**
  5. **Resume from remaining videos** (skip already downloaded)
  6. After download complete → Hide modal
  7. Show list view

- **"Cancel" pressed:**
  When user presses **Cancel** on CustomErrorModal:

1. Hide CustomErrorModal
2. Show video list (Downloaded , new and failed status)
3. Display floating bottom component: **`<BottomButtonSectionWithText/>`**

## New Component: `<BottomButtonSectionWithText/>`

### Purpose

Alert user about incomplete downloads and provide retry option

#### Component Properties

- **Warning Text:** "কিছু সংখ্যক ভিডিও ডাউনলোড বাকি আছে।"
- **Button Text:** "আবার চেষ্টা করুন"
- **Position:** Bottom of screen (floating/fixed)
- **Behavior:** Floats over the video list items
- **Style:** Should be prominent but not blocking main content

### User Journey After Error

```
Download Error Occurs
         ↓
CustomErrorModal Shows
    ┌────┴────┐
    ↓         ↓
[Cancel]  [আবার চেষ্টা করুন]
    ↓         ↓
    │     Retry Download
    │     (existing flow)
    ↓
Hide CustomErrorModal
    ↓
Show Video List
(all the videos , downloaded,  not downloaded, )
    ↓
Show <BottomButtonSectionWithText/>
(Floating at bottom)
    ↓
User Can:
├─ Browse & watch downloaded videos
├─ Press "আবার চেষ্টা করুন" on bottom
└─ Close app (component persists on next open)
```

## `<BottomButtonSectionWithText/>` Behavior

### When to Show

✅ After user cancels download with incomplete videos
✅ On app open if previous download was incomplete
✅ After pull-to-refresh if videos still pending
<BottomButtonSectionWithText
warningText="কিছু সংখ্যক ভিডিও ডাউনলোড বাকি আছে।"
buttonText="আবার চেষ্টা করুন"
onRetryPress={() => {/_ Handle retry logic _/}}
pendingCount={3} // Optional: number of pending videos
/>

---

### Refresh Functionality

When user refreshes the video list:

1. Show `<CustomLoader/>`
2. Get API response
3. Load data
4. Hide loader
5. Show **DownloadingProcess Modal**
6. Download **only new videos**

**Example:**

- Previously: 7 videos downloaded
- After refresh: 9 total videos (7 old + 2 new)
- Download status shows: "7/9"
- Only downloads the 2 new videos

---

## Questions & Missing Information

### 1. Download Progress Display

**Question:** How should individual file progress be shown?

- Options: Percentage? Progress bar? File size (downloaded/total)?
- **Status:**
  ans : only show Percentage, Progress bar

### 2. Download Strategy

**Question:** Do you download one video at a time or multiple simultaneously?

- **Status:** ⚠️ Needs clarification
  ans : at a time one vide will be download

### 3. CustomLoader Color

**Question:** ActivityIndicator color is `#00ff00` (green) - is this correct or should it match app theme?

- **Status:** yes this will app primary color i will update it

### 4. Cancel Button Behavior

**Question:** What should happen when user presses cancel on CustomErrorModal?

- Just hide modal and stay on current screen?
- Stop all downloads?
- **Status:** ⚠️ Needs clarification
  ans :

### 7. Opacity Values

**Question:** What specific opacity value for CustomLoader background?

- 0.5? 0.7? Other?
- **Status:** ⚠️ Needs clarification

### 8. Network Check Frequency

**Question:** Should you check internet connection:

- Before each video download?
- Only at the start of batch download?
- **Status:** ⚠️ Needs clarification

### 9. Partial Downloads

**Question:** If a video partially downloads and fails:

- Resume that specific video from where it stopped?
- Re-download it completely?
- **Status:** ⚠️ Needs clarification

### 10. Success Feedback

**Question:** After all downloads complete, is there:

- Success message/notification?
- Or directly show list view?
- **Status:** ⚠️ Needs clarification

---

## Summary

### Clear Requirements:

✅ Three components needed (DownloadingProcess Modal, CustomLoader, CustomErrorModal , BottomButtonSectionWithText)
✅ Basic flow on app open (memory check → internet check → API call → download)
✅ Error handling with retry functionality
✅ Refresh functionality with smart download (only new videos)
✅ Resume capability after errors

### Needs Clarification:

⚠️ 10 questions listed above require answers before implementation
⚠️ Specific UI/UX details for progress display
⚠️ Error handling edge cases
⚠️ Download strategy and tracking mechanism
