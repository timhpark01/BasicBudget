import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '@/types/database';
import ColorPicker from '@/components/shared/ColorPicker';

interface CategoryEditModalProps {
  visible: boolean;
  category: Category;
  onClose: () => void;
  onSave: (updates: { name: string; color: string }) => Promise<void>;
}

export default function CategoryEditModal({
  visible,
  category,
  onClose,
  onSave,
}: CategoryEditModalProps) {
  const [name, setName] = useState(category.name);
  const [selectedColor, setSelectedColor] = useState(category.color);
  const [saving, setSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Reset when category changes or modal opens
  useEffect(() => {
    if (visible) {
      setName(category.name);
      setSelectedColor(category.color);
      setIsFocused(false);

      // Animate in
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Focus input after modal appears (delay to allow animation to complete)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, category]);

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Invalid Name', 'Please enter a category name.');
      return;
    }

    if (name.length > 20) {
      Alert.alert('Name Too Long', 'Category name must be 20 characters or less.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        color: selectedColor,
      });
      Alert.alert('Success', 'Category updated successfully!');
      onClose();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <View onStartShouldSetResponder={() => true}>
            <Animated.View
              style={[
                styles.modal,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: scaleAnim,
                }
              ]}
            >
              {/* Accent Bar */}
              <View style={[styles.accentBar, { backgroundColor: selectedColor }]} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: selectedColor + '20' },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as any}
                      size={32}
                      color={selectedColor}
                    />
                  </View>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>Edit Category</Text>
                    <Text style={styles.subtitle}>Update name and color</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={32} color="#ccc" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Content */}
              <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Category Name</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      isFocused && styles.inputWrapperFocused,
                      { borderColor: isFocused ? selectedColor : '#e0e0e0' }
                    ]}
                  >
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter category name"
                      placeholderTextColor="#ccc"
                      maxLength={20}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.helperText}>
                    {name.length}/20 characters
                  </Text>
                </View>

                {/* Color Picker */}
                <View style={styles.pickerContainer}>
                  <ColorPicker
                    selectedColor={selectedColor}
                    onSelectColor={setSelectedColor}
                  />
                </View>
              </ScrollView>

              {/* Save Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: selectedColor },
                    (!name.trim() || saving) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!name.trim() || saving}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 0,
    width: '90%',
    maxWidth: 420,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  accentBar: {
    height: 6,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  scrollContent: {
    maxHeight: 550,
  },
  inputContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  inputWrapperFocused: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  pickerContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  saveButton: {
    backgroundColor: '#355e3b',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#d0d0d0',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
