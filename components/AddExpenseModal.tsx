import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category, Expense } from '@/types/database';
import { CATEGORIES } from '@/constants/categories';

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
  const [amount, setAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
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
  }, [editExpense, visible]);

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
              <ActivityIndicator size="small" color="#2f95dc" />
            ) : (
              <Ionicons name="checkmark" size={28} color="#2f95dc" />
            )}
          </TouchableOpacity>
        </View>

        {/* Category Selection Background */}
        <ScrollView style={styles.categoryBackground} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((category) => (
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
        </ScrollView>

        {/* Calculator Overlay */}
        <View style={styles.calculatorContainer}>
          {/* Amount Display */}
          <View style={styles.amountDisplay}>
            <Text style={styles.currencySymbol}>$</Text>
            <Text style={styles.amountText}>{amount}</Text>
          </View>

          {/* Date and Note Fields */}
          <View style={styles.detailsContainer}>
            <TouchableOpacity style={styles.dateButton}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.dateText}>{formatDate(date)}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)"
              value={note}
              onChangeText={setNote}
              placeholderTextColor="#999"
            />
          </View>

          {/* Calculator Keypad */}
          <View style={styles.keypad}>
            <View style={styles.keypadRow}>
              <CalculatorButton label="1" onPress={() => handleNumberPress('1')} />
              <CalculatorButton label="2" onPress={() => handleNumberPress('2')} />
              <CalculatorButton label="3" onPress={() => handleNumberPress('3')} />
            </View>
            <View style={styles.keypadRow}>
              <CalculatorButton label="4" onPress={() => handleNumberPress('4')} />
              <CalculatorButton label="5" onPress={() => handleNumberPress('5')} />
              <CalculatorButton label="6" onPress={() => handleNumberPress('6')} />
            </View>
            <View style={styles.keypadRow}>
              <CalculatorButton label="7" onPress={() => handleNumberPress('7')} />
              <CalculatorButton label="8" onPress={() => handleNumberPress('8')} />
              <CalculatorButton label="9" onPress={() => handleNumberPress('9')} />
            </View>
            <View style={styles.keypadRow}>
              <CalculatorButton label="." onPress={handleDecimalPress} />
              <CalculatorButton label="0" onPress={() => handleNumberPress('0')} />
              <CalculatorButton
                label="⌫"
                onPress={handleBackspace}
                onLongPress={handleClear}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface CalculatorButtonProps {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
}

function CalculatorButton({ label, onPress, onLongPress }: CalculatorButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.calcButton,
        pressed && styles.calcButtonPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Text style={styles.calcButtonText}>{label}</Text>
    </Pressable>
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
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  amountText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
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
  keypad: {
    paddingHorizontal: 24,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calcButton: {
    flex: 1,
    aspectRatio: 2.5,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  calcButtonPressed: {
    backgroundColor: '#e0e0e0',
  },
  calcButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
});
