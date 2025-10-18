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

export default function VideoSearchBar({
  onSearch,
  isSearching = false,
  placeholder = 'Search videos...',
}) {
  const [searchText, setSearchText] = useState('');

  const handleSearch = useCallback(() => {
    if (searchText.trim() && searchText.trim().length >= 3 && !isSearching) {
      onSearch(searchText.trim());
    }
  }, [searchText, onSearch, isSearching]);

  const handleClear = useCallback(() => {
    setSearchText('');
    onSearch(''); // Clear search results
  }, [onSearch]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder={placeholder}
          placeholderTextColor={ThemeColors.colorGray}
          editable={!isSearching}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />

        <View style={styles.buttonContainer}>
          {searchText.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
              disabled={isSearching}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
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
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: ThemeColors.colorWhite,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ThemeColors.colorLightGray || '#E0E0E0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: ThemeColors.colorGray || '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: ThemeColors.colorBlack,
    backgroundColor: ThemeColors.colorWhite,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ThemeColors.colorGray || '#CCCCCC',
    backgroundColor: ThemeColors.colorWhite,
  },
  clearButtonText: {
    color: ThemeColors.colorGray,
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: ThemeColors.colorPrimary || '#007AFF',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: ThemeColors.colorGray || '#CCCCCC',
  },
  searchButtonText: {
    color: ThemeColors.colorWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
