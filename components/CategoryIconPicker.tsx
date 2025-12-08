import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_ICONS } from '@/constants/colors';

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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Icon</Text>
      <View style={styles.iconsGrid}>
        {CATEGORY_ICONS.map((iconName) => (
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
          >
            <Ionicons
              name={iconName as any}
              size={28}
              color={selectedIcon === iconName ? color : '#666'}
            />
          </TouchableOpacity>
        ))}
      </View>
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
});
