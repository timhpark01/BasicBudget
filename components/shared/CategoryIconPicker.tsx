import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_ICONS } from '@/constants/colors';
import { IoniconsName } from '@/types/database';

interface CategoryIconPickerProps {
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
  color: string;
}

export default function CategoryIconPicker({
  selectedIcon,
  onSelectIcon,
  color,
}: CategoryIconPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIcons = CATEGORY_ICONS.filter(icon =>
    searchQuery ? icon.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Icon</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search icons (e.g., food, travel)..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search category icons"
        placeholderTextColor="#999"
      />

      <View style={styles.iconsGrid}>
        {filteredIcons.map((iconName) => (
          <TouchableOpacity
            key={iconName}
            style={[
              styles.iconBox,
              selectedIcon === iconName && {
                backgroundColor: color + '20',
                borderColor: color,
              },
            ]}
            onPress={() => onSelectIcon(iconName)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${iconName} icon`}
            accessibilityState={{ selected: selectedIcon === iconName }}
            accessibilityHint="Double tap to select this icon for your category"
          >
            <Ionicons
              name={iconName as IoniconsName}
              size={28}
              color={selectedIcon === iconName ? color : '#666'}
            />
          </TouchableOpacity>
        ))}
      </View>

      {filteredIcons.length === 0 && (
        <Text style={styles.noResults}>
          No icons found for "{searchQuery}". Try a different search.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    marginTop: 24,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
