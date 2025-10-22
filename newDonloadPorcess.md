show download process in modal:
what we gonna show inside the modal:

- download process for a single file
- total number of files which are going to be downloaded
- total files are downloaded

- modal title will be “ডাউনলোড হচ্ছে ”
- modal description warning“ইন্টারনেট সংযোগ চাল রাখুন !
  অনুগ্রহ পূর্বক মোবাইল এপ কার্যক্রম চালু রাখুন !”
- while downloading, the current title will be shown along with the download process
- dont have any hide or close button

whe will create a custom loader component wich will show on full scrren
whith the <ActivityIndicator size="large" color="#00ff00" />
this loader will show over the content with tranparent opcaity
component name <CustomLoader/>

We create a CustomErrorModal which will show the process error. there will be button name with “আবার চেষ্ট্রা করুন ” this button onPress defination will write from parent compoent , there will be cancel button which will hide the modal

the functionality:
after the app is open:

- device memory check (as we are doing currently)
- Then the internet check (as currently we are doing )
  - If there is no internet, then show
    - we will show <CustomLoader/>
    - Then load the downloaded videos
    - after loaded complete then hide <ActivityIndicator size="large" />
  - if there is an internet connection the call the api
    - Every time we call the api, this time we will show <CustomLoader/>
    - After getting the response, we will render the data behind the <CustomLoader/>
    - after properly loaded the data <CustomLoader/> will be hide
    - Then the DownloadingProcess model wil show
  - inisde the donwload process modal
    - all the data processing/ downloading functionality will be done inside the modal
    - during the process if there is issue on downloaded
      - like internet issue
      - url issue / downloaded process issue
      - any kind of issue we get
      - The Downloading Process modal will be hide
      - CustomErrorModal will be shown.
        - if user press on “আবার চেষ্ট্রা করুন ” loader will start again then api call
        - Then again, DownloadingProcess will be show.
          - The downloaded part will start from the rest of the video, which needs to be downloaded.
          - After completing the download, the modal will be hidden
        - Then the user will see the list view

now what happen if user refresh the video list

- If the user refreshes, then the loader will start
- get the response from api , loaded the data
  - loder will hide
  - the DownloadingProcess modal will open and will start the new videos
    _ like on before there was 7 videos , and we get two after refresh, like nide, and we know 7 vide has already downloaded
    so the download status number will be 7/9
    _
