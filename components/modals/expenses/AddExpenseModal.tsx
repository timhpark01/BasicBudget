import { useCategories } from '@/hooks/useCategories';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { Category, Expense, RecurrenceFrequency } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import CalculatorKeypad from '@/components/shared/CalculatorKeypad';
import CalendarPicker from '@/components/shared/CalendarPicker';
import CategoriesModal from '@/components/modals/categories/CategoriesModal';
import { moderateScale, scaleFontSize, scaleWidth, scaleHeight } from '@/lib/utils/responsive';
import { canAddDecimalDigit } from '@/lib/utils/number-formatter';

// Maximum amount to prevent UI overflow (10 million)
const MAX_AMOUNT = 9999999999999.99;

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
  onCategoryChanged?: (categoryId: string) => Promise<void>;
  onSaveRecurring?: (expense: {
    amount: string;
    category: Category;
    note: string;
    frequency: RecurrenceFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
    monthOfYear?: number;
    startDate: Date;
  }) => void | Promise<void>;
}

export default function AddExpenseModal({
  visible,
  onClose,
  editExpense,
  onSave,
  onCategoryChanged,
  onSaveRecurring,
}: AddExpenseModalProps) {
  // Responsive sizing
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const { allCategories, refreshCategories } = useCategories({
    onCategoryChanged,
  });

  const [amount, setAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'calculator' | 'calendar'>('calculator');
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  // Recurring expense state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0); // 0 = Sunday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [monthOfYear, setMonthOfYear] = useState<number>(1); // 1 = January
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Pre-fill form when editing
  useEffect(() => {
    if (visible) {
      // Refresh categories to show latest changes
      refreshCategories();
    }

    if (editExpense) {
      setAmount(editExpense.amount);
      setSelectedCategory(editExpense.category);
      setDate(editExpense.date);
      setNote(editExpense.note);
      // For now, editing doesn't support recurring (only one-time expenses)
      setIsRecurring(false);
    } else {
      // Reset form when adding new
      setAmount('0');
      setSelectedCategory(null);
      setDate(new Date());
      setNote('');
      setIsRecurring(false);
      setFrequency('monthly');
      setDayOfWeek(0);
      setDayOfMonth(1);
      setMonthOfYear(1);
      setHasEndDate(false);
      setEndDate(new Date());
    }
    // Reset to calculator mode when modal opens
    setInputMode('calculator');
  }, [editExpense, visible, refreshCategories]);

  const handleNumberPress = (num: string) => {
    // Check if adding this digit would exceed 2 decimal places
    if (!canAddDecimalDigit(amount)) {
      return;
    }

    let newAmount: string;
    if (amount === '0') {
      newAmount = num;
    } else {
      newAmount = amount + num;
    }

    // Check if the new amount would exceed the maximum
    const newAmountNum = parseFloat(newAmount);
    if (!isNaN(newAmountNum) && newAmountNum > MAX_AMOUNT) {
      return; // Don't add the digit if it exceeds the max
    }

    setAmount(newAmount);
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

  const handleCategoryLongPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Edit Categories',
      'Would you like to edit your categories?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit Categories',
          onPress: () => setShowCategoriesModal(true),
        },
      ]
    );
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
      if (isRecurring) {
        // Save as recurring expense
        if (!onSaveRecurring) {
          Alert.alert('Error', 'Recurring expenses are not supported in this context.');
          return;
        }
        await onSaveRecurring({
          amount,
          category: selectedCategory,
          note,
          frequency,
          dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
          dayOfMonth: frequency === 'monthly' || frequency === 'yearly' ? dayOfMonth : undefined,
          monthOfYear: frequency === 'yearly' ? monthOfYear : undefined,
          startDate: date,
        });
      } else {
        // Save as one-time expense
        await onSave({
          amount,
          category: selectedCategory,
          date,
          note,
        });
      }

      // Reset form only after successful save
      setAmount('0');
      setSelectedCategory(null);
      setNote('');
      setDate(new Date());
      setIsRecurring(false);
      onClose();
    } catch (err) {
      // Error is handled by parent component or shown here
      console.error('Save failed:', err);
      Alert.alert('Error', 'Failed to save. Please try again.');
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

  // Calculate responsive heights
  const calculatorHeight = scaleHeight(320); // Height of calculator
  const bottomSpacing = calculatorHeight + moderateScale(100); // Extra padding to ensure last row is visible

  return (
    <>
      <Modal
        visible={visible && !showCategoriesModal}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editExpense ? 'Edit Expense' : 'Add Expense'}
            </Text>
            <TouchableOpacity onPress={() => setShowCategoriesModal(true)}>
              <Ionicons name="create-outline" size={28} color="#355e3b" />
            </TouchableOpacity>
          </View>

        {/* Category Selection Background */}
        <ScrollView
          style={styles.categoryBackground}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomSpacing }}
        >
          {/* Recurring Expense Toggle - Only show when adding new */}
          {!editExpense && (
            <View style={styles.recurringSection}>
              <View style={styles.recurringToggleRow}>
                <View style={styles.recurringLabelContainer}>
                  <Ionicons name="repeat-outline" size={20} color="#355e3b" />
                  <Text style={styles.recurringLabel}>Recurring Expense</Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#D1D1D6', true: '#355e3b' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D1D6"
                />
              </View>

              {isRecurring && (
                <View style={styles.recurringOptions}>
                  {/* Frequency Selector */}
                  <Text style={styles.fieldLabel}>Frequency</Text>
                  <View style={styles.frequencyButtons}>
                    {(['daily', 'weekly', 'monthly', 'yearly'] as RecurrenceFrequency[]).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.frequencyButton,
                          frequency === freq && styles.frequencyButtonActive,
                        ]}
                        onPress={() => setFrequency(freq)}
                      >
                        <Text
                          style={[
                            styles.frequencyButtonText,
                            frequency === freq && styles.frequencyButtonTextActive,
                          ]}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Weekly: Day of Week Picker */}
                  {frequency === 'weekly' && (
                    <View style={styles.pickerContainer}>
                      <Text style={styles.fieldLabel}>Day of Week</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.dayButtons}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <TouchableOpacity
                              key={day}
                              style={[
                                styles.dayButton,
                                dayOfWeek === index && styles.dayButtonActive,
                              ]}
                              onPress={() => setDayOfWeek(index)}
                            >
                              <Text
                                style={[
                                  styles.dayButtonText,
                                  dayOfWeek === index && styles.dayButtonTextActive,
                                ]}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Monthly/Yearly: Day of Month Picker */}
                  {(frequency === 'monthly' || frequency === 'yearly') && (
                    <View style={styles.pickerContainer}>
                      <Text style={styles.fieldLabel}>Day of Month</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.dayButtons}>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <TouchableOpacity
                              key={day}
                              style={[
                                styles.dayButton,
                                dayOfMonth === day && styles.dayButtonActive,
                              ]}
                              onPress={() => setDayOfMonth(day)}
                            >
                              <Text
                                style={[
                                  styles.dayButtonText,
                                  dayOfMonth === day && styles.dayButtonTextActive,
                                ]}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                  {/* Yearly: Month Picker */}
                  {frequency === 'yearly' && (
                    <View style={styles.pickerContainer}>
                      <Text style={styles.fieldLabel}>Month</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.dayButtons}>
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                            <TouchableOpacity
                              key={month}
                              style={[
                                styles.monthButton,
                                monthOfYear === index + 1 && styles.dayButtonActive,
                              ]}
                              onPress={() => setMonthOfYear(index + 1)}
                            >
                              <Text
                                style={[
                                  styles.dayButtonText,
                                  monthOfYear === index + 1 && styles.dayButtonTextActive,
                                ]}
                              >
                                {month}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}

                </View>
              )}
            </View>
          )}

          <View style={styles.categoriesGrid}>
            {allCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTile,
                  selectedCategory?.id === category.id && styles.categoryTileSelected,
                ]}
                onPress={() => setSelectedCategory(category)}
                onLongPress={handleCategoryLongPress}
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
                    name={category.icon as any}
                    size={28}
                    color={
                      selectedCategory?.id === category.id ? '#fff' : category.color
                    }
                  />
                </View>
                <Text
                  style={styles.categoryName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Input Area - Calculator */}
        <View style={styles.calculatorContainer}>
          {/* Date and Note Fields */}
          <View style={styles.detailsContainer}>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setInputMode('calendar')}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateText}>
                  {isRecurring && !editExpense ? `Starts: ${formatDate(date)}` : formatDate(date)}
                </Text>
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
        </View>

        {/* Calendar Picker Overlay */}
        {inputMode === 'calendar' && (
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
      </Modal>

      {/* Categories Modal for editing/adding/reordering categories */}
      <CategoriesModal
        visible={showCategoriesModal}
        onClose={() => {
          setShowCategoriesModal(false);
          refreshCategories();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(16),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    color: '#333',
  },
  categoryBackground: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  recurringSection: {
    backgroundColor: '#fff',
    marginHorizontal: moderateScale(16),
    marginTop: moderateScale(16),
    marginBottom: moderateScale(12),
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
  },
  recurringToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurringLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#333',
  },
  recurringOptions: {
    marginTop: moderateScale(16),
    gap: moderateScale(16),
  },
  fieldLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#666',
    marginBottom: moderateScale(8),
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    backgroundColor: '#f0f0f0',
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#355e3b',
  },
  frequencyButtonText: {
    fontSize: scaleFontSize(10),
    fontWeight: '600',
    color: '#666',
  },
  frequencyButtonTextActive: {
    color: '#fff',
  },
  pickerContainer: {
    gap: moderateScale(8),
  },
  dayButtons: {
    flexDirection: 'row',
    gap: moderateScale(8),
    paddingHorizontal: moderateScale(4),
  },
  dayButton: {
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(14),
    backgroundColor: '#f0f0f0',
    borderRadius: moderateScale(8),
    minWidth: scaleWidth(44),
    alignItems: 'center',
  },
  monthButton: {
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(12),
    backgroundColor: '#f0f0f0',
    borderRadius: moderateScale(8),
    minWidth: scaleWidth(50),
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#355e3b',
  },
  dayButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: moderateScale(16),
  },
  categoryTile: {
    width: '25%',
    aspectRatio: 1,
    padding: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTileSelected: {
    opacity: 1,
  },
  categoryIconContainer: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(8),
  },
  categoryName: {
    fontSize: scaleFontSize(12, 10, 14),
    color: '#666',
    textAlign: 'center',
  },
  calculatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingTop: moderateScale(20),
    paddingBottom: moderateScale(20),
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
