import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { ArrowIconDownWhite, PlayButtonIcon } from '../../AppAssets/SvgLogos';
import { H4, TextPrimary } from '../../AppTheme';
import useAppLanguage from '../../Hooks/useAppLagnuage';
import { UtilityFunctions } from '../../UtilityFunctions/UtilityFunctions';
import ButtonSquare from '../Button/ButtonSquare';
import { Chip, ChipWarning } from '../Chip/Chip';

// {
//       "id": 2,
//       "name": "গোপাল ভাঁড় বাংলা কার্টুনের ভিডিও",
//       "filetype": "video/mp4",
//       "filesize": "64557685",
//       "file_duration": "1326.46",
//       "description": "\"In this entertaining episode of Gopal Dada, Gopal once again showcases his wit and intelligence by helping Raja Krishna Chandra Roy handle Nawab Bahadur, earning high praise for his cleverness. Impressed and grateful, the Raja gifts Gopal 5 acres of land. However, the cunning Maha Mantri has been eyeing the land for himself and devises a devious plan to claim it. He visits Khambaji Raja and learns that the Raja’s daughter has left her husband and wishes to stay at her father’s house. Seizing the opportunity, the Mantri convinces Khambaji Raja to have his daughter marry Gopal, ensuring that Gopal would stay there forever. The episode unfolds with humor, clever schemes, and suspense, keeping viewers guessing whether the Mantri will succeed or if Gopal will outsmart him once again.\r\n\r\n\r\nShow Name: Gopal Bhar - গোপালভাঁড়\r\nDirected By: Sourav Mondal, Hansa Mondal\r\nWritten By: Hansa Mondal\r\nOriginal language: Bengali\r\nEpisode No: 873",
//       "created_at": "2025-10-04T17:42:02.000000Z",
//       "updated_at": "2025-10-04T17:42:02.000000Z"
//     }

export default function CardVideoListItem({
  cardItem,
  isDownloaded,
  isDownloading,
}) {
  let {
    id,
    name,
    filetype,
    filesize,
    file_duration,
    description,
    isDownloadingError,
  } = cardItem;

  const { i18n } = useAppLanguage();

  let [collapsed, setCollapsed] = useState(true);

  const renderCollapsedContent = () => {
    return (
      <Collapsible collapsed={collapsed} align="center">
        <TextPrimary textStyle={{}} ellipsizeMode="tail">
          {description}
        </TextPrimary>
      </Collapsible>
    );
  };

  const renderDuration = () => {
    const minutes = Math.floor(file_duration / 60);
    const seconds = Math.floor(file_duration % 60);
    const formattedTotalDuration = `${UtilityFunctions.getNumbersFromString(
      minutes,
    )} : ${UtilityFunctions.getNumbersFromString(seconds)}`;
    return <Chip text={formattedTotalDuration} />;
  };

  const renderFileSize = () => {
    const readableFileSize = `${(filesize / (1024 * 1024)).toFixed(2)} MB`;
    return (
      <Chip text={UtilityFunctions.getNumbersFromString(readableFileSize)} />
    );
  };

  const renderVideoDownloadStatus = () => {
    if (isDownloaded) {
      return <Chip text={i18n('downloaded')} />;
    } else {
      return <ChipWarning text={i18n('not_downloaded')} />;
    }
  };

  const middleSection = () => {
    return (
      <View style={{ width: '70%' }}>
        <H4>{name}</H4>
        {renderCollapsedContent()}
        <View style={{ flexDirection: 'row' }}>
          {renderDuration()}
          {renderFileSize()}
          {renderVideoDownloadStatus()}
        </View>
      </View>
    );
  };

  const renderMainContent = () => {
    return (
      <TouchableOpacity style={styles.cardContainer}>
        <PlayButtonIcon />
        {middleSection()}
        <ButtonSquare
          logo={<ArrowIconDownWhite />}
          onPress={() => setCollapsed(!collapsed)}
        />
      </TouchableOpacity>
    );
  };

  const renderOverlayViewWithDownloadProcess = () => {
    return (
      <View style={styles.overlayContainer}>
        <TextPrimary textStyle={{ color: '#fff', fontWeight: 'bold' }}>
          {i18n('downloading')}...
        </TextPrimary>
      </View>
    );
  };

  return (
    <View style={{ marginBottom: 10 }}>
      {renderMainContent()}
      {isDownloading && renderOverlayViewWithDownloadProcess()}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#C9D2C0',
    borderRadius: 5,
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent black overlay
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensures overlay is on top
  },
  overlayContent: {
    // padding: 15,
    // backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker background for content
    // borderRadius: 8,
    // alignItems: 'center',
  },
});
