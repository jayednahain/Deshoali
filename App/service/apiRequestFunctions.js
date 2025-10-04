import axiosInstance from './axiosBaseInstances';

/**
 * Authentication APIs
 */
const authenticateUser = async (username, password) => {
  try {
    const response = await axiosInstance.post('/auth/login', {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

const refreshToken = async token => {
  try {
    const response = await axiosInstance.post('/auth/refresh', { token });
    return response.data;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

/**
 * Video APIs - DUMMY IMPLEMENTATION with provided data
 */
let lastApiCall = 0;
const API_CALL_THROTTLE = 5000; // 5 seconds throttle

const getVideoList = async () => {
  try {
    // DUMMY DATA - bypassing actual API call
    const now = Date.now();
    if (now - lastApiCall > API_CALL_THROTTLE) {
      console.log('🔄 Using dummy video list data... (throttled)');
      lastApiCall = now;
    }

    // Simulate network delay (reduced from 1000ms to 300ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    const dummyVideoList = {
      categories: [
        {
          name: 'Movies',
          videos: [
            {
              id: 'for-bigger-blazes',
              description:
                'HBO GO now works with Chromecast -- the easiest way to enjoy online video on your TV. For when you want to settle into your Iron Throne to watch the latest episodes. For $35.\nLearn how to use Chromecast with HBO GO and more at google.com/chromecast.',
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
              ],
              subtitle: 'By Google',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/WhatCarCanYouGetForAGrand.jpg',
              title: 'For Bigger Blazes',
            },
            {
              id: 'for-bigger-escape',
              description:
                "Introducing Chromecast. The easiest way to enjoy online video and music on your TV—for when Batman's escapes aren't quite big enough. For $35. Learn how to use Chromecast with Google Play Movies and more at google.com/chromecast.",
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
              ],
              subtitle: 'By Google',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
              title: 'For Bigger Escape',
            },
            {
              id: 'for-bigger-fun',
              description:
                'Introducing Chromecast. The easiest way to enjoy online video and music on your TV. For $35. Find out more at google.com/chromecast.',
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
              ],
              subtitle: 'By Google',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg',
              title: 'For Bigger Fun',
            },
            {
              id: 'for-bigger-joyrides',
              description:
                'Introducing Chromecast. The easiest way to enjoy online video and music on your TV—for the times that call for bigger joyrides. For $35. Learn how to use Chromecast with YouTube and more at google.com/chromecast.',
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
              ],
              subtitle: 'By Google',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
              title: 'For Bigger Joyrides',
            },
            {
              id: 'for-bigger-meltdowns',
              description:
                "Introducing Chromecast. The easiest way to enjoy online video and music on your TV—for when you want to make Buster's big meltdowns even bigger. For $35. Learn how to use Chromecast with Netflix and more at google.com/chromecast.",
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
              ],
              subtitle: 'By Google',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg',
              title: 'For Bigger Meltdowns',
            },
            {
              id: 'sintel',
              description:
                'Sintel is an independently produced short film, initiated by the Blender Foundation as a means to further improve and validate the free/open source 3D creation suite Blender. With initial funding provided by 1000s of donations via the internet community, it has again proven to be a viable development model for both open 3D technology as for independent animation film.\nThis 15 minute film has been realized in the studio of the Amsterdam Blender Institute, by an international team of artists and developers. In addition to that, several crucial technical and creative targets have been realized online, by developers and artists and teams all over the world.\nwww.sintel.org',
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
              ],
              subtitle: 'By Blender Foundation',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
              title: 'Sintel',
            },
            {
              id: 'subaru-outback',
              description:
                'Smoking Tire takes the all-new Subaru Outback to the highest point we can find in hopes our customer-appreciation Balloon Launch will get some free T-shirts into the hands of our viewers.',
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
              ],
              subtitle: 'By Garage419',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/WeAreGoingOnBullrun.jpg',
              title: 'Subaru Outback On Street And Dirt',
            },
            {
              id: 'tears-of-steel',
              description:
                'Tears of Steel was realized with crowd-funding by users of the open source 3D creation tool Blender. Target was to improve and test a complete open and free pipeline for visual effects in film - and to make a compelling sci-fi film in Amsterdam, the Netherlands. The film itself, and all raw material used for making it, have been released under the Creatieve Commons 3.0 Attribution license. Visit the tearsofsteel.org website to find out more about this, or to purchase the 4-DVD box with a lot of extras. (CC) Blender Foundation - http://www.tearsofsteel.org',
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
              ],
              subtitle: 'By Blender Foundation',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg',
              title: 'Tears of Steel',
            },
            {
              id: 'volkswagen-gti',
              description:
                "The Smoking Tire heads out to Adams Motorsports Park in Riverside, CA to test the most requested car of 2010, the Volkswagen GTI. Will it beat the Mazdaspeed3's standard-setting lap time? Watch and see...",
              sources: [
                'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
              ],
              subtitle: 'By Garage419',
              thumb:
                'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/VolkswagenGTIReview.jpg',
              title: 'Volkswagen GTI Review',
            },
          ],
        },
      ],
    };

    return dummyVideoList;
  } catch (error) {
    console.error('Get video list error:', error);
    throw error;
  }
};

/**
 * Legacy video APIs - keeping for backward compatibility
 */
const getVideos = async (search, tags) => {
  console.log('search:', search, 'tags:', tags);
  let searchQueryString = '';
  searchQueryString +=
    tags && tags.length > 0
      ? tags.map(tag => `tags_like=${tag}`).join('&')
      : '';
  searchQueryString += search ? `&q=${search}` : '';

  console.log('/videos/?' + searchQueryString);
  const response = await axiosInstance.get('/videos/?' + searchQueryString);
  return response.data;
};

const getTags = async () => {
  const response = await axiosInstance.get('/tags');
  return response.data;
};

const getVideoById = async id => {
  const response = await axiosInstance.get(`/videos/${id}`);
  return response.data;
};

const getRelatedVideos = async ({ id, tags }) => {
  let pageLimit = `&_limit=${5}`;
  let exceptNotShowingVideo = `&id_ne=${id}`;
  let tagsQuery =
    tags && tags.length > 0
      ? tags.map(tag => `tags_like=${tag}`).join('&')
      : '';

  const response = await axiosInstance.get(
    `/videos?${tagsQuery}${exceptNotShowingVideo}${pageLimit}`,
  );
  console.log(response.data);
  return response.data;
};

/**
 * Download progress tracking
 */
const downloadVideo = async (videoUrl, onProgress) => {
  try {
    const response = await axiosInstance.get(videoUrl, {
      responseType: 'blob',
      onDownloadProgress: progressEvent => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error('Download video error:', error);
    throw error;
  }
};

export {
  // Auth functions
  authenticateUser,
  downloadVideo,
  getRelatedVideos,
  getTags,
  getVideoById,
  // Video functions
  getVideoList,
  // Legacy functions
  getVideos,
  refreshToken,
};
