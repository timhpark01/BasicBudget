import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRESET_COLORS } from '@/constants/colors';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export default function ColorPicker({ selectedColor, onSelectColor }: ColorPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Color</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorsContainer}
      >
        {PRESET_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorCircle,
              { backgroundColor: color },
              selectedColor === color && styles.selectedColorCircle,
            ]}
            onPress={() => onSelectColor(color)}
            activeOpacity={0.7}
          >
            {selectedColor === color && (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  colorsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorCircle: {
    borderColor: '#333',
    borderWidth: 3,
  },
});
