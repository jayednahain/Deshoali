# React Native Video Player App - Requirements & Architecture

## Overview

This document outlines the requirements and architecture for a React Native mobile app that behaves as an offline-capable video player. The app authenticates using a fixed username/password, fetches a list of videos from an API, supports progressive background downloading, manages video file storage and status, and works reliably both online and offline.

---

## 1. **Authentication**

- **Flow:**  
  - On app launch, make an Auth API call with a fixed username and password.
  - There is **no login screen**; this is a background process.
  - Store the received JWT securely in local storage (use `AsyncStorage`).
  - Use this JWT for all subsequent API requests (e.g., the list API).

---

## 2. **Fetching Video List**

- After authentication, call the **List API** to fetch the list of video items.
- Example data shape (`mediaJSON`):
  ```json
  {
    "categories": [
      {
        "name": "Movies",
        "videos": [
          {
            "description": "Sample description",
            "sources": ["http://.../ForBiggerBlazes.mp4"],
            "subtitle": "By Google",
            "thumb": "images/ForBiggerBlazes.jpg",
            "title": "For Bigger Blazes"
          },
          ... // More video objects
        ]
      }
    ]
  }
  ```

---

## 3. **UI - Video Cards**

- Render a card for each video returned by the API.
- Display:
  - Thumbnail
  - Title (if downloaded)
  - Download status (pending, downloading with progress %, or completed)
- **Statuses:**
  1. **pending**: Not started downloading
  2. **started**: Currently downloading (show % progress)
  3. **completed**: Downloaded and playable

---

## 4. **Download Management**

- Videos are downloaded one at a time, beginning with the first pending video.
- **While downloading:**
  - The active card shows download % (e.g., "10%").
  - Others show "pending" or "downloading".
  - As each video completes, update its status and begin the next.
- **Storage:**  
  - Files are saved in the device's local storage (recommend `react-native-fs`).
  - File path and status are tracked for each video.

- **Status Persistence:**
  - Use a lightweight database (`AsyncStorage` for simple, or SQLite/Realm for more advanced cases) to store:
    - Video ID
    - Status
    - Local file path

---

## 5. **Status Recovery and Offline Behavior**

- **On App Restart:**
  - Fetch the latest video list from the API.
  - Compare API list with local status storage:
    - If a video is marked as `completed`, show as downloaded.
    - All other videos (including those that were downloading or pending) are set to `pending`.
      - **No resuming:** If a download was in progress and the app closed or lost connection, it restarts from 0%.
- **Offline Mode:**
  - If the user is offline, display all locally downloaded videos as available.
  - The user can play any completed video from local storage.
  - Non-downloaded videos show as "pending" and can't be played.

---

## 6. **Video Playback**

- On tapping a completed video card, navigate to a details page.
- Use a stable package such as [`react-native-video`](https://github.com/react-native-video/react-native-video) to play the video from local storage (using saved file path).

---

## 7. **Syncing New Videos from the API**

- On regaining internet connection:
  - Fetch the latest video list from the API again.
  - **Compare**:
    - Match by unique identifier (such as video ID or title).
    - If new videos appear (e.g., API now has 6 videos but you had 5), append these to the local list as `pending`.
    - Start download as per normal logic.
  - Previously downloaded videos remain as `completed` and playable.

---

## 8. **Local Database Recommendation**
currently use async storage ,
make a separate DB config file i wll set and get the data with a common set or get function , behind the seen you will override the db config functions ,
like on DB config directory there will be file name asyncStorage.js 
another index.js , on index.js i will decide which im going to use , like
asyncStorage.js  there will be other file name SQLiteConfig.js ,

<!-- - **For simple apps (few videos):**  
  Use `AsyncStorage` or `MMKV` for key-value status tracking.
- **For scalable, queryable, or larger apps:**  
  Use `SQLite` (e.g., with `react-native-sqlite-storage`) or `Realm` for structured data, fast queries, and robust persistence. -->

---

## 9. **Summary Table: Video Status Handling**

| App State                          | Displayed Status After Restart |
|:------------------------------------|:------------------------------|
| Downloaded                         | completed                     |
| Downloading (interrupted/closed)    | pending (restarts download)   |
| Pending                            | pending                       |
| New video from API                  | pending                       |

---

## 10. **Key Points**

- Download status is only persisted for **completed** downloads.
- All in-progress or not-started videos revert to **pending** on app restart or network loss.
- When new videos are detected from the API, they're shown as pending and handled by the normal download logic.
- The app is fully usable offline, limited to completed downloads.
- Video playback uses the local file path for `react-native-video`.

---

## 11. **Basic Pseudocode for Status Sync**

```js

```

---

## 12. **References**

- [react-native-fs](https://github.com/itinance/react-native-fs)
- [react-native-video](https://github.com/react-native-video/react-native-video)
- [react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage)
- [Realm React Native](https://www.mongodb.com/docs/realm/sdk/react-native/)

---

If you need further details or code examples for any specific part, please let me know!

## 13. state management use redux
i have provided a demo use the pattern 

##14 use axios
