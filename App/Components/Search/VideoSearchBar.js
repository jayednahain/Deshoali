import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemeColors } from '../../AppTheme';
import useAppLanguage from '../../Hooks/useAppLagnuage';

export default function VideoSearchBar({
  onSearch,
  isSearching = false,
  placeholder = 'Search videos...',
}) {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { i18n } = useAppLanguage();

  const handleSearch = useCallback(() => {
    if (searchText.trim() && searchText.trim().length >= 3 && !isSearching) {
      onSearch(searchText.trim());
    }
  }, [searchText, onSearch, isSearching]);

  const handleClear = useCallback(() => {
    setSearchText('');
    onSearch(''); // Clear search results
  }, [onSearch]);

  const handleChangeText = useCallback(
    text => {
      setSearchText(text);
      // Clear search results when text is empty
      if (text.trim() === '') {
        onSearch('');
      }
    },
    [onSearch],
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          isFocused && styles.searchContainerFocused,
        ]}
      >
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={ThemeColors.colorGray || '#94A3B8'}
          editable={!isSearching}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        <View style={styles.buttonContainer}>
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              disabled={isSearching}
            >
              <Text style={styles.clearButtonText}>{i18n('clear_search')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.searchButton,
              (searchText.trim().length < 3 || isSearching) &&
                styles.searchButtonDisabled,
            ]}
            onPress={handleSearch}
            disabled={searchText.trim().length < 3 || isSearching}
          >
            {isSearching ? (
              <ActivityIndicator size="small" color={ThemeColors.colorWhite} />
            ) : (
              <Text style={styles.searchButtonText}>{i18n('search')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchContainerFocused: {
    borderColor: ThemeColors.colorPrimary,
    shadowColor: '#353535',
    shadowOpacity: 0.2,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 0,
    paddingHorizontal: 8,
    fontSize: 12,
    color: ThemeColors.colorBlack,
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ThemeColors.colorPrimary,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  clearButtonText: {
    color: ThemeColors.colorPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  searchButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: ThemeColors.colorPrimary, // Vibrant pink/coral
    minWidth: 65,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#424242',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  searchButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  searchButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
