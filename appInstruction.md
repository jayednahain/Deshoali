# Video Player App - Requirements Analysis

## Step-by-Step Requirement Breakdown

---

### **Step 1: First Time App Open (No Internet History)**

**Flow:**

- App opens → No videos exist locally
- Call API → Get video list (e.g., 3 videos: [2, 1, 0])
- Display the list immediately
- Start downloading automatically in order: 0 → 1 → 2 (sequential, one by one)

**Questions:**

- Do the numbers [2,1,0] represent the order from API, or video IDs?
- Should we show them in the order they come from API?,
  ans : dont need to sort or make order, a video id will provide if there is new video added it will added on the top

---

### **Step 2: Second App Open (With Previous Downloads)**

**Flow:**

- App opens → Call API again
- API returns 4 videos: [3, 2, 1, 0]
- Logic needed:
  - Video 3 = NEW (not in local storage)
  - Videos 2, 1, 0 = ALREADY DOWNLOADED (skip these)
- Start downloading only video 3
- User sees all 4 videos in the list (with different states)

**Questions:**

- How do we identify if a video is "the same"? By video ID? By title? By URL?
  ans: By video ID
- If video 2, 1, 0 metadata changes in API (like title or description), should we update that info without re-downloading the video file?,
  ans: no there will no meta data update

---

### **Step 3: Offline Mode**

**Flow:**

- App opens → No internet connection
- Don't call API
- Show only videos that are fully DOWNLOADED from local storage
- Hide or grey out videos that are NEW or DOWNLOADING

**Questions:**

- Should we show a message "You are offline" or just silently show downloaded videos?
  ans : yes we will show a message you are offline or changes some design
- What happens if a video was DOWNLOADING when internet was lost? Show it as incomplete?
  ans : when user goes offline / or internet, while downloading a single video if we are getting any error from the process, like url issue , inter net issue this download process will stop we will show an error to user ,
  there will be a try again button , if user press try again button the download will start from the beginning
  while downloading if user get any error , and close the app , the error video will remove from the memory

---

### **Step 4: Download Progress & Video Access**

**Video States:**

1. **NEW** - Not started downloading
2. **DOWNLOADING** - Currently downloading (show progress?)
3. **DOWNLOADED** - Complete, ready to play

**Rules:**

- User can ONLY click and watch videos that are DOWNLOADED
- NEW and DOWNLOADING videos should be disabled/greyed out

**Questions:**

- Should we show download progress percentage (0-100%) on DOWNLOADING videos?
  ans: yes we will
- Can user pause/cancel downloads?
  ans : no , while downloading under the download process we will show a warning text that dont close or make any error , other wise download will be re-start

---

### **Step 5: Video Details & Playback**

**Flow:**

- User clicks DOWNLOADED video → Navigate to video details screen
- Video details screen shows:
  - Video player
  - Play/Pause controls
  - Video metadata (title, description?)

**Questions:**

- Do you want seek/scrubbing controls (move forward/backward in video)?
- Fullscreen mode?
  ans : yes
- Any other playback controls (speed, quality)?
- ans no

---

### **Step 6: Search Functionality**

**Features:**

- Search bar at top of video list
- Only searches when user types **3 or more characters**
- Searches by **video title** (case-insensitive?)
- Real-time search (as user types) or search button?

**Questions:**

- Should search work across ALL videos (NEW, DOWNLOADING, DOWNLOADED)?

- Or only search within downloaded videos when offline?

---

### **Step 7: Filter Checkboxes**

**UI:**
Under search bar, 3 checkboxes:

- ☐ Downloaded
- ☐ Downloading
- ☐ New

**Questions:**

- Can user select multiple checkboxes? (e.g., show Downloaded + New only)
  ans: by default all the videos will be show, user cant check multiple check item,
- Or radio buttons (select only one)?
  ans: yes check box only select one time
- If no checkbox selected, show all videos?
  ans: yes
- Do filters work with search together? (Search + filter combination)
  ans : yes of course

  note:
  if the app is offline - ☐ Downloading - ☐ New
  this two checkbox will disable

---

### **Step 8: API Call Strategy**

**Rules:**

- Call API **only once** when app opens
- Don't call API again until app is closed and reopened
- If user stays in app for hours, no API refresh

**Questions:**

- What if user pulls to refresh? Should we provide manual refresh option?
  yes: there will be pull to refresh
- What if API call fails? Retry? Show error message?
  yes there will be a model
  ans : here we running the app in offline mood right ,
  on 1st on our UI check if there is network available or not ,

  error cases:
  for new user ():
  if the network is not available: ,
  then check the is there any local download available or not
  if there is local videos show the local videos
  else a view will show there like "ইন্টারনেট কানেকশন নেই। ভিডিও ডাউনলোড করা যাচ্ছে না। "

      if network is available:
        but api got error , the view will be like "সাময়িক ভাবে সমস্যা হচ্ছে ।  কিছুক্ষন পর আবার চেষ্টা করনুন " with retry button the will call the api again

  for existing user (the user that already downloaded video):
  if the network is not available:
  only show the downloaded video

  if network is available:(just opened the app):
  but api error a model bottom sheet will be pop up
  with text "সাময়িক ভাবে সমস্যা হচ্ছে । কিছুক্ষন পর আবার চেষ্টা করনুন";
  there will be two button "cancel korun " and "abar chesta kornu"

---

### **Step 9: Sequential Download Order**

**Rules:**

- Videos must download one by one: [0 → 1 → 2 → 3 → 4]
- Never parallel downloads
- Downloads start automatically after API sync

**Questions:**

- What's the order based on? API response order? Video ID number?
  ans: based on id
- If download fails, skip it and move to next? Or retry?
  ans: if download fail , we will move to next item ,
  like [0,1,2,3]
  0 started completed , 1 started and failed then move to 2,
  then 3 ,4 downloaded , but 5 got failed
  currently there are 2 video that are incomplete
  so what we will do is set up a retry button where if video got error,
  among this two if user re try one it will stat download again ,
  we download it manually , at same time we can press the other failed video right ,
  but that time while one is downloading if we re try another , we will open a bottom sheet like with text like "বর্তমান এ একটি ভিডিও ডাউনলোড হচ্ছে। কিছুক্ষন পর আবার চেষ্টা করুন।
  " wih a ok button ,
  heres the thing if any files is downloading there will be a common state that we can access, is there any thing is in download process or not ,
  next we will kep app config flag that we will decide , we want multiple download at same time or not
  when its true we wont show this model "বর্তমান এ একটি ভিডিও ডাউনলোড হচ্ছে। কিছুক্ষন পর আবার চেষ্টা করুন। " if false we will show
- If user closes app during download, resume when app reopens?
  ans: there will be back ground service , if the app in on pause state like minizie the app , download process will be running, if app goes to pause state we will show toast("ভিডিও ডাউনলোড চলছে )

  If user closes app during download:
  we will show toast. after colsing the ("ভিডিও ডাউনলোড batil kor hoyeche )

---

## Additional Clarifications Needed

### **Video Identification**

- What makes a video unique?
  - Video ID from API?
  - Video URL?
  - Title?
- This is critical to know which videos are "already downloaded"

### **Storage Management**

- Where to store videos? Internal storage? External storage?
  ans: by defult the memory location will be phone
  but we will implement functionality for memory chose, after app installation user will select phone just a simple select phone or memory , after selection then the storage check will call ,
- File size limits? What if phone storage is full?
  ans : when app open we check the phone/ memory card current free memory is equal 1gb(1000000kb) or smaller then after app open a modal wii be open , on modal title "আপনার মোবাইল মেমোরি তে পর্যাপ্ত পরিমান জায়গা নেই। " there will be button on press this button user will exit from the app
- Should user be able to delete individual videos?

### **Background Behavior**

- Should downloads continue when:
  - App is in background?
    ans: in back ground but not on notification bar (will implement it feature)
  - Screen is off?
    ans : yes if the app is in minimize mode,
  - App is completely closed?
    ans : if app is completely close download will be close
- Use foreground service for downloads?
- ans yes of course

### **Error Handling**

- What happens if:
  - Download fails mid-way? Retry? Show failed state?
  - API returns no videos?
  - Video file is corrupted after download?

### **Video Metadata**

- What info comes from API for each video:
  - ID, title, description, video URL, thumbnail URL?
  - Duration, file size?
  - Any other metadata?

---

## Next Steps

Please review and answer the questions in each section so we can:

1. Finalize the requirements
2. Design the optimal architecture
3. Plan the implementation strategy

**Priority Questions to Answer:**

1. How do we uniquely identify videos?
   ans : "id":
2. Single or multiple checkbox selection for filters?
3. Should downloads continue in background/when app closed?
4. What metadata does the API provide?
