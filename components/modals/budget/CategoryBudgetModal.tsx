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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatNumberWithCommas, sanitizeDecimalInput } from '@/lib/utils/number-formatter';
import { IoniconsName, CategoryBudget } from '@/types/database';

interface CategoryBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  currentBudget?: string;
  onSave: (budgetAmount: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  categoryId?: string;
  currentMonth?: string;
  allCategoryBudgets?: CategoryBudget[];
}

export default function CategoryBudgetModal({
  visible,
  onClose,
  categoryName,
  categoryIcon,
  categoryColor,
  currentBudget,
  onSave,
  onDelete,
  categoryId,
  currentMonth,
  allCategoryBudgets = [],
}: CategoryBudgetModalProps) {
  const [budgetAmount, setBudgetAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Set budget amount - use current budget or find most recent budget
      let initialBudget = currentBudget || '';

      // If no current budget and we have the necessary data, find the most recent budget
      if (!currentBudget && categoryId && currentMonth && allCategoryBudgets.length > 0) {
        // Filter budgets for this category from months before the current month
        const previousBudgets = allCategoryBudgets
          .filter((b) => b.categoryId === categoryId && b.month < currentMonth)
          .sort((a, b) => b.month.localeCompare(a.month));

        // Use the most recent budget if found
        if (previousBudgets.length > 0) {
          initialBudget = previousBudgets[0].budgetAmount;
        }
      }

      setBudgetAmount(initialBudget);
      setDisplayAmount(initialBudget ? formatNumberWithCommas(initialBudget) : '');
      setIsFocused(false);
      // Animate in
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
      // Focus input after modal appears
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, currentBudget, categoryId, currentMonth, allCategoryBudgets]);

  const handleAmountChange = (text: string) => {
    // Remove all commas and non-numeric characters except decimal point
    const rawValue = text.replace(/[^\d.]/g, '');

    // Sanitize to ensure no more than 2 decimal places
    const sanitizedValue = sanitizeDecimalInput(rawValue, 2);

    // Update the raw value for saving
    setBudgetAmount(sanitizedValue);

    // Update the display value with commas
    setDisplayAmount(formatNumberWithCommas(sanitizedValue));
  };

  const handleSave = async () => {
    if (!budgetAmount.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(budgetAmount);
      onClose();
    } catch (error) {
      console.error('Failed to save category budget:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Failed to delete category budget:', error);
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
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
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
              <View style={[styles.accentBar, { backgroundColor: categoryColor }]} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: categoryColor + '20' },
                    ]}
                  >
                    <Ionicons
                      name={categoryIcon as IoniconsName}
                      size={32}
                      color={categoryColor}
                    />
                  </View>
                  <View style={styles.titleContainer}>
                    <Text style={styles.title}>{categoryName}</Text>
                    <Text style={styles.subtitle}>Set Monthly Budget</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={32} color="#ccc" />
                </TouchableOpacity>
              </View>

              {/* Budget Input */}
              <View style={styles.inputContainer}>
                <View
                  style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperFocused,
                    { borderColor: isFocused ? categoryColor : '#e0e0e0' }
                  ]}
                >
                  <View style={styles.dollarContainer}>
                    <Text style={styles.dollarSign}>$</Text>
                  </View>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={displayAmount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#ccc"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    selectTextOnFocus
                  />
                </View>
                {budgetAmount && parseFloat(budgetAmount) > 0 && (
                  <Text style={styles.helperText}>
                    You'll be able to track spending against this budget
                  </Text>
                )}
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: categoryColor },
                    (!budgetAmount.trim() || saving) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!budgetAmount.trim() || saving}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Saving...' : currentBudget ? 'Update Budget' : 'Set Budget'}
                  </Text>
                </TouchableOpacity>

                {currentBudget && onDelete && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                    disabled={saving}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" style={styles.buttonIcon} />
                    <Text style={styles.deleteButtonText}>Remove Budget</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </TouchableOpacity>
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
    width: '92%',
    minWidth: 340,
    maxWidth: 480,
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
  inputContainer: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dollarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#f0f0f0',
  },
  dollarSign: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#666',
  },
  input: {
    flex: 1,
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
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
  deleteButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});
