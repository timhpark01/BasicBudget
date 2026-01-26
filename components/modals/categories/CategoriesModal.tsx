import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { useCategories } from '@/hooks/useCategories';
import ColorPicker from '@/components/shared/ColorPicker';
import CategoryIconPicker from '@/components/shared/CategoryIconPicker';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Category } from '@/types/database';

interface CategoriesModalProps {
  visible: boolean;
  onClose: () => void;
}

type Mode = 'list' | 'add' | 'edit';

export default function CategoriesModal({ visible, onClose }: CategoriesModalProps) {
  const {
    allCategories,
    customCategories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refreshCategories,
  } = useCategories();

  // Refresh categories from DB whenever the modal becomes visible
  useEffect(() => {
    if (visible) {
      refreshCategories();
    }
  }, [visible, refreshCategories]);

  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('wallet');
  const [selectedColor, setSelectedColor] = useState('#355e3b');
  const [saving, setSaving] = useState(false);

  const handleAddNew = () => {
    setMode('add');
    setEditingId(null);
    setName('');
    setSelectedIcon('wallet');
    setSelectedColor('#355e3b');
  };

  const handleEdit = (categoryId: string) => {
    const category = allCategories.find((c) => c.id === categoryId);
    if (!category) return;

    setMode('edit');
    setEditingId(categoryId);
    setName(category.name);
    setSelectedIcon(category.icon);
    setSelectedColor(category.color);
  };

  const handleSave = async () => {
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
      if (mode === 'add') {
        await addCategory({
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
        Toast.show({
          type: 'success',
          text1: 'Category created',
          text2: `${name.trim()} is ready to use`,
          position: 'top',
          visibilityTime: 3000,
          autoHide: true,
        });
      } else if (mode === 'edit' && editingId) {
        await updateCategory(editingId, {
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
        Toast.show({
          type: 'success',
          text1: 'Category updated',
          text2: 'Changes saved successfully',
          position: 'top',
          visibilityTime: 3000,
          autoHide: true,
        });
      }
      setMode('list');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    const category = allCategories.find((c) => c.id === categoryId);
    if (!category) return;

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deleted = await deleteCategory(categoryId);
              if (!deleted) {
                // Expenses exist, ask to reassign
                Alert.alert(
                  'Category In Use',
                  `Some expenses use this category. They will be reassigned to "Unlabeled" if you delete it.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reassign & Delete',
                      style: 'destructive',
                      onPress: async () => {
                        // Force deletion with automatic reassignment
                        try {
                          await deleteCategory(categoryId, true);
                          Toast.show({
                            type: 'success',
                            text1: 'Category deleted',
                            text2: `${category.name} removed and expenses reassigned`,
                            position: 'top',
                            visibilityTime: 3000,
                            autoHide: true,
                          });
                        } catch (err: any) {
                          Alert.alert('Error', err.message || 'Failed to delete category.');
                        }
                      },
                    },
                  ]
                );
              } else {
                Toast.show({
                  type: 'success',
                  text1: 'Category deleted',
                  text2: `${category.name} has been removed`,
                  position: 'top',
                  visibilityTime: 3000,
                  autoHide: true,
                });
              }
            } catch (err: any) {
              const isRecurring = err.message?.includes('recurring expense');
              Alert.alert(
                isRecurring ? 'Cannot Delete Category' : 'Error',
                err.message || 'Failed to delete category.'
              );
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    setMode('list');
    setEditingId(null);
  };

  const handleReorder = async (data: Category[]) => {
    try {
      const categoryIds = data.map((c) => c.id);
      await reorderCategories(categoryIds);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reorder categories.');
    }
  };

  const renderCategoryItem = ({ item, drag, isActive }: RenderItemParams<Category>) => {
    // Protected category: Unlabeled (ID '6')
    const isProtected = item.id === '6' || item.name === 'Unlabeled';

    return (
      <ScaleDecorator>
        <View style={[styles.categoryCard, isActive && styles.categoryCardActive]}>
          <TouchableOpacity
            onLongPress={async () => {
              if (isProtected) return; // Prevent dragging protected categories
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              drag();
            }}
            disabled={isActive || isProtected}
            style={[styles.dragHandle, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            accessibilityRole="button"
            accessibilityLabel={isProtected ? "Cannot reorder protected category" : "Drag to reorder"}
            accessibilityHint={isProtected ? "" : "Long press and drag to change category order"}
          >
            <Ionicons name="reorder-two" size={24} color={isProtected ? "#ccc" : "#355e3b"} />
            <Text style={{ fontSize: 11, color: isProtected ? '#ccc' : '#999' }}>Hold</Text>
          </TouchableOpacity>
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: item.color + '20' },
            ]}
          >
            <Ionicons
              name={item.icon}
              size={24}
              color={item.color}
            />
          </View>
          <Text style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
          {isProtected ? (
            <View style={styles.protectedBadge}>
              <Text style={styles.protectedBadgeText}>Protected</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => handleEdit(item.id)}
                style={styles.actionButton}
              >
                <Ionicons name="create-outline" size={20} color="#355e3b" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={mode === 'list' ? onClose : handleCancel}
            style={styles.closeButton}
          >
            <Ionicons name={mode === 'list' ? 'close' : 'arrow-back'} size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {mode === 'list' ? 'Categories' : mode === 'add' ? 'Add Category' : 'Edit Category'}
          </Text>
          {mode === 'list' ? (
            <TouchableOpacity onPress={handleAddNew} style={styles.addButton}>
              <Ionicons name="add" size={28} color="#355e3b" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                Save
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {mode === 'list' ? (
          <GestureHandlerRootView style={styles.flex}>
            {allCategories.length > 0 ? (
              <DraggableFlatList
                data={allCategories}
                onDragEnd={({ data }) => handleReorder(data)}
                keyExtractor={(item) => item.id}
                renderItem={renderCategoryItem}
                contentContainerStyle={styles.content}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="pricetag-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No categories yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the + button to create your first category
                </Text>
              </View>
            )}
          </GestureHandlerRootView>
        ) : (
          <ScrollView style={styles.content}>
            <View style={styles.formSection}>
              <Text style={styles.label}>
                Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={mode === 'add' ? 'e.g., Groceries, Entertainment' : 'Enter new name'}
                placeholderTextColor="#999"
                maxLength={20}
                autoCapitalize="words"
                autoFocus={true}
              />
              {mode === 'edit' && (
                <Text style={styles.helperText}>
                  Renaming will update all expenses in this category
                </Text>
              )}
            </View>

            <ColorPicker
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
            />

            <CategoryIconPicker
              selectedIcon={selectedIcon}
              onSelectIcon={setSelectedIcon}
              color={selectedColor}
            />

            {mode === 'add' && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
                <Text style={styles.infoText}>
                  Custom categories will appear alongside default categories when
                  adding expenses.
                </Text>
              </View>
            )}

            {saving && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#355e3b" />
                <Text style={styles.loadingText}>Saving...</Text>
              </View>
            )}
          </ScrollView>
        )}

        {loading && mode === 'list' && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#355e3b" />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#355e3b',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryCardActive: {
    backgroundColor: '#f0f8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    marginRight: 12,
    padding: 4,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  protectedBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  protectedBadgeText: {
    fontSize: 12,
    color: '#f57c00',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF6B6B',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
