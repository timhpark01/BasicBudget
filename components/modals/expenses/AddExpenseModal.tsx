import { useCategories } from '@/hooks/useCategories';
import { Category, Expense } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import CalculatorKeypad from '@/components/shared/CalculatorKeypad';
import CalendarPicker from '@/components/shared/CalendarPicker';

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  editExpense?: Expense | null;
  onSave: (expense: {
    amount: string;
    category: Category | null;
    date: Date;
    note: string;
  }) => void | Promise<void>;
}

export default function AddExpenseModal({
  visible,
  onClose,
  editExpense,
  onSave,
}: AddExpenseModalProps) {
  const { allCategories, refreshCategories } = useCategories();
  const [amount, setAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'calculator' | 'calendar'>('calculator');

  // Pre-fill form when editing
  useEffect(() => {
    if (visible) {
      // Refresh categories to show latest changes from CategoriesModal
      refreshCategories();
    }

    if (editExpense) {
      setAmount(editExpense.amount);
      setSelectedCategory(editExpense.category);
      setDate(editExpense.date);
      setNote(editExpense.note);
    } else {
      // Reset form when adding new
      setAmount('0');
      setSelectedCategory(null);
      setDate(new Date());
      setNote('');
    }
    // Reset to calculator mode when modal opens
    setInputMode('calculator');
  }, [editExpense, visible, refreshCategories]);

  const handleNumberPress = (num: string) => {
    if (amount === '0') {
      setAmount(num);
    } else {
      setAmount(amount + num);
    }
  };

  const handleDecimalPress = () => {
    if (!amount.includes('.')) {
      setAmount(amount + '.');
    }
  };

  const handleBackspace = () => {
    if (amount.length === 1) {
      setAmount('0');
    } else {
      setAmount(amount.slice(0, -1));
    }
  };

  const handleClear = () => {
    setAmount('0');
  };

  const handleSave = async () => {
    // Validate category is selected
    if (!selectedCategory) {
      Alert.alert('Missing Category', 'Please select a category for this expense.');
      return;
    }

    // Validate amount is valid
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    // Show loading state while saving
    setLoading(true);

    try {
      await onSave({
        amount,
        category: selectedCategory,
        date,
        note,
      });

      // Reset form only after successful save
      setAmount('0');
      setSelectedCategory(null);
      setNote('');
      setDate(new Date());
    } catch (err) {
      // Error is handled by parent component
      console.error('Save failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editExpense ? 'Edit Expense' : 'Add Expense'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#355e3b" />
            ) : (
              <Ionicons name="checkmark" size={28} color="#355e3b" />
            )}
          </TouchableOpacity>
        </View>

        {/* Category Selection Background */}
        <ScrollView style={styles.categoryBackground} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesGrid}>
            {allCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTile,
                  selectedCategory?.id === category.id && styles.categoryTileSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <View
                  style={[
                    styles.categoryIconContainer,
                    { backgroundColor: category.color + '20' },
                    selectedCategory?.id === category.id && {
                      backgroundColor: category.color,
                    },
                  ]}
                >
                  <Ionicons
                    name={category.icon}
                    size={28}
                    color={
                      selectedCategory?.id === category.id ? '#fff' : category.color
                    }
                  />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Input Area - Calculator or Calendar */}
        <View style={styles.calculatorContainer}>
          {inputMode === 'calculator' ? (
            <>
              {/* Date and Note Fields */}
              <View style={styles.detailsContainer}>
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setInputMode('calendar')}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.dateText}>{formatDate(date)}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSave}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark" size={24} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.noteInput}
                  placeholder="Add a note (optional)"
                  value={note}
                  onChangeText={setNote}
                  placeholderTextColor="#999"
                />
              </View>

              {/* Calculator Keypad */}
              <CalculatorKeypad
                amount={amount}
                onNumberPress={handleNumberPress}
                onDecimalPress={handleDecimalPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
              />
            </>
          ) : (
            <CalendarPicker
              currentDate={date}
              onConfirm={(selectedDate) => {
                setDate(selectedDate);
                setInputMode('calculator');
              }}
              onCancel={() => setInputMode('calculator')}
            />
          )}
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  bottomSpacer: {
    height: 100,
    width: '100%',
  },
  categoryBackground: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingBottom: 400,
  },
  categoryTile: {
    width: '25%',
    aspectRatio: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTileSelected: {
    opacity: 1,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  calculatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  detailsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  submitButton: {
    width: 48,
    height: 48,
    backgroundColor: '#355e3b',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  noteInput: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
  },
});
