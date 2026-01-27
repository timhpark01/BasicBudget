import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import CalculatorKeypad from '@/components/shared/CalculatorKeypad';
import { formatCurrency, formatNumberWithCommas, canAddDecimalDigit } from '@/lib/utils/number-formatter';

// Maximum amount to prevent UI overflow (10 million)
const MAX_AMOUNT = 9999999999999.99;

interface BudgetCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
}

interface IncomeItem {
  id: string;
  name: string;
  amount: string;
}

interface ExpenseItem {
  id: string;
  name: string;
  amount: string;
}

interface AllocationItem {
  id: string;
  name: string;
  amount: string;
  color: string;
}

type FocusedField = {
  type: 'income' | 'expense' | 'allocation';
  id: string;
} | null;

const ALLOCATION_COLORS = ['#355e3b', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#E91E63'];

export default function BudgetCalculatorModal({ visible, onClose }: BudgetCalculatorModalProps) {
  const [incomes, setIncomes] = useState<IncomeItem[]>([
    { id: '1', name: 'Salary', amount: '' },
  ]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: '1', name: 'Rent/Mortgage', amount: '' },
    { id: '2', name: 'Utilities', amount: '' },
    { id: '3', name: 'Internet', amount: '' },
  ]);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [allocations, setAllocations] = useState<AllocationItem[]>([
    { id: '1', name: 'Savings', amount: '', color: ALLOCATION_COLORS[0] },
    { id: '2', name: 'Investments', amount: '', color: ALLOCATION_COLORS[1] },
  ]);

  const addAllocation = () => {
    const colorIndex = allocations.length % ALLOCATION_COLORS.length;
    setAllocations([
      ...allocations,
      {
        id: Date.now().toString(),
        name: '',
        amount: '',
        color: ALLOCATION_COLORS[colorIndex],
      },
    ]);
  };

  const removeAllocation = (id: string) => {
    setAllocations(allocations.filter((item) => item.id !== id));
  };

  const updateAllocation = (id: string, field: 'name' | 'amount', value: string) => {
    setAllocations(
      allocations.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

  const scrollViewRef = useRef<ScrollView>(null);
  const allocationSectionY = useRef(0);
  const allocationRowPositions = useRef<Record<string, number>>({});

  // Scroll to focused allocation row when keypad opens
  useEffect(() => {
    if (focusedField?.type === 'allocation') {
      const rowY = allocationRowPositions.current[focusedField.id];
      if (rowY !== undefined) {
        const absoluteY = allocationSectionY.current + rowY;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: absoluteY - 80, animated: true });
        }, 100);
      }
    }
  }, [focusedField]);

  const addIncome = () => {
    setIncomes([
      ...incomes,
      { id: Date.now().toString(), name: '', amount: '' },
    ]);
  };

  const removeIncome = (id: string) => {
    if (incomes.length > 1) {
      setIncomes(incomes.filter((item) => item.id !== id));
    }
  };

  const updateIncome = (id: string, field: 'name' | 'amount', value: string) => {
    setIncomes(
      incomes.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addExpense = () => {
    setExpenses([
      ...expenses,
      { id: Date.now().toString(), name: '', amount: '' },
    ]);
  };

  const removeExpense = (id: string) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((item) => item.id !== id));
    }
  };

  const updateExpense = (id: string, field: 'name' | 'amount', value: string) => {
    setExpenses(
      expenses.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateTotalIncome = () => {
    return incomes.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const calculateDisposableIncome = () => {
    return calculateTotalIncome() - calculateTotalExpenses();
  };

  // Get current amount from focused field
  const getCurrentAmount = () => {
    if (!focusedField) return '0';

    if (focusedField.type === 'income') {
      const income = incomes.find(i => i.id === focusedField.id);
      return income?.amount || '0';
    } else if (focusedField.type === 'expense') {
      const expense = expenses.find(e => e.id === focusedField.id);
      return expense?.amount || '0';
    } else {
      const allocation = allocations.find(a => a.id === focusedField.id);
      return allocation?.amount || '0';
    }
  };

  // Update focused field amount
  const updateFocusedAmount = (newAmount: string) => {
    if (!focusedField) return;

    if (focusedField.type === 'income') {
      updateIncome(focusedField.id, 'amount', newAmount);
    } else if (focusedField.type === 'expense') {
      updateExpense(focusedField.id, 'amount', newAmount);
    } else {
      updateAllocation(focusedField.id, 'amount', newAmount);
    }
  };

  // Calculator keypad handlers
  const handleNumberPress = (num: string) => {
    const currentAmount = getCurrentAmount();

    // Check if adding this digit would exceed 2 decimal places
    if (!canAddDecimalDigit(currentAmount)) {
      return;
    }

    let newAmount: string;
    if (currentAmount === '0') {
      newAmount = num;
    } else {
      newAmount = currentAmount + num;
    }

    // Check if the new amount would exceed the maximum
    const newAmountNum = parseFloat(newAmount);
    if (!isNaN(newAmountNum) && newAmountNum > MAX_AMOUNT) {
      return; // Don't add the digit if it exceeds the max
    }

    updateFocusedAmount(newAmount);
  };

  const handleDecimalPress = () => {
    const currentAmount = getCurrentAmount();
    if (!currentAmount.includes('.')) {
      updateFocusedAmount(currentAmount + '.');
    }
  };

  const handleBackspace = () => {
    const currentAmount = getCurrentAmount();
    if (currentAmount.length === 1) {
      updateFocusedAmount('0');
    } else {
      updateFocusedAmount(currentAmount.slice(0, -1));
    }
  };

  const handleClear = () => {
    updateFocusedAmount('0');
  };

  const handleDoneCalculator = () => {
    setFocusedField(null);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Calculator',
      'Are you sure you want to clear all entries?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setIncomes([{ id: '1', name: 'Salary', amount: '' }]);
            setExpenses([
              { id: '1', name: 'Rent/Mortgage', amount: '' },
              { id: '2', name: 'Car Payments', amount: '' },
              { id: '3', name: 'Internet', amount: '' },
            ]);
            setAllocations([
              { id: '1', name: 'Savings', amount: '', color: ALLOCATION_COLORS[0] },
              { id: '2', name: 'Investments', amount: '', color: ALLOCATION_COLORS[1] },
            ]);
          },
        },
      ]
    );
  };

  const renderSwipeDelete = (
    progress: Animated.AnimatedInterpolation<number>,
    onDelete: () => void,
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
      extrapolate: 'clamp',
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeDeleteAction, { opacity, transform: [{ scale }] }]}>
        <TouchableOpacity style={styles.swipeDeleteButton} onPress={onDelete} activeOpacity={0.7}>
          <Ionicons name="trash" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const totalIncome = calculateTotalIncome();
  const totalExpenses = calculateTotalExpenses();
  const disposableIncome = calculateDisposableIncome();

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
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Budget Calculator</Text>
          <TouchableOpacity onPress={handleReset}>
            <Ionicons name="refresh" size={28} color="#355e3b" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={focusedField ? { paddingBottom: 320 } : undefined}
        >
          {/* Info Note */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle-outline" size={20} color="#355e3b" />
            <Text style={styles.infoNoteText}>
              This is a planning tool to help you decide on a budget. Nothing entered here is saved to your main budgets.
            </Text>
          </View>

          {/* Income Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash" size={24} color="#355e3b" />
              <Text style={styles.sectionTitle}>Monthly Income</Text>
            </View>

            {incomes.map((income) => (
              <Swipeable
                key={income.id}
                renderRightActions={(progress) => incomes.length > 1
                  ? renderSwipeDelete(progress, () => removeIncome(income.id))
                  : undefined
                }
                overshootRight={false}
              >
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={income.name}
                    onChangeText={(value) => updateIncome(income.id, 'name', value)}
                    placeholder="Income source"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={[
                      styles.amountInputContainer,
                      focusedField?.type === 'income' && focusedField?.id === income.id && styles.amountInputFocused
                    ]}
                    onPress={() => setFocusedField({ type: 'income', id: income.id })}
                  >
                    <Text style={styles.dollarSign}>$</Text>
                    <Text style={[
                      styles.amountInput,
                      !income.amount && styles.amountPlaceholder
                    ]}>
                      {income.amount ? formatNumberWithCommas(income.amount) : '0.00'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Swipeable>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addIncome}>
              <Ionicons name="add-circle" size={20} color="#355e3b" />
              <Text style={styles.addButtonText}>Add Income Source</Text>
            </TouchableOpacity>

            <View style={styles.sectionTotalRow}>
              <Text style={styles.sectionTotalLabel}>Total Monthly Income</Text>
              <Text style={styles.sectionTotalIncome}>{formatCurrency(totalIncome)}</Text>
            </View>
          </View>

          {/* Expenses Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt" size={24} color="#DC3545" />
              <Text style={styles.sectionTitle}>Fixed Monthly Expenses</Text>
            </View>

            {expenses.map((expense) => (
              <Swipeable
                key={expense.id}
                renderRightActions={(progress) => expenses.length > 1
                  ? renderSwipeDelete(progress, () => removeExpense(expense.id))
                  : undefined
                }
                overshootRight={false}
              >
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={expense.name}
                    onChangeText={(value) => updateExpense(expense.id, 'name', value)}
                    placeholder="Expense name"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={[
                      styles.amountInputContainer,
                      focusedField?.type === 'expense' && focusedField?.id === expense.id && styles.amountInputFocused
                    ]}
                    onPress={() => setFocusedField({ type: 'expense', id: expense.id })}
                  >
                    <Text style={styles.dollarSign}>$</Text>
                    <Text style={[
                      styles.amountInput,
                      !expense.amount && styles.amountPlaceholder
                    ]}>
                      {expense.amount ? formatNumberWithCommas(expense.amount) : '0.00'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Swipeable>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addExpense}>
              <Ionicons name="add-circle" size={20} color="#355e3b" />
              <Text style={styles.addButtonText}>Add Fixed Expense</Text>
            </TouchableOpacity>

            <View style={styles.sectionTotalRow}>
              <Text style={styles.sectionTotalLabel}>Total Fixed Expenses</Text>
              <Text style={styles.sectionTotalExpense}>{formatCurrency(totalExpenses)}</Text>
            </View>
          </View>

          {/* Disposable Income */}
          <View style={styles.disposableCard}>
            <Text style={styles.disposableLabel}>Disposable Income</Text>
            <Text
              style={[
                styles.disposableAmount,
                disposableIncome < 0 && styles.summaryNegative,
              ]}
            >
              {formatCurrency(disposableIncome)}
            </Text>
            {disposableIncome < 0 && (
              <Text style={styles.disposableWarning}>
                Expenses exceed income
              </Text>
            )}
          </View>

          {/* Savings Goals Section */}
          <View
            style={styles.allocationsSection}
            onLayout={(e) => { allocationSectionY.current = e.nativeEvent.layout.y; }}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="pie-chart" size={24} color="#355e3b" />
              <Text style={styles.sectionTitle}>Savings Goals</Text>
            </View>

            {allocations.map((allocation) => {
              const amt = parseFloat(allocation.amount) || 0;
              const pctOfIncome = totalIncome > 0 ? (amt / totalIncome) * 100 : 0;
              const pctOfDisposable = disposableIncome > 0 ? (amt / disposableIncome) * 100 : 0;

              return (
                <Swipeable
                  key={allocation.id}
                  renderRightActions={(progress) =>
                    renderSwipeDelete(progress, () => removeAllocation(allocation.id))
                  }
                  overshootRight={false}
                >
                  <View
                    style={styles.allocationItem}
                    onLayout={(e) => {
                      allocationRowPositions.current[allocation.id] = e.nativeEvent.layout.y;
                    }}
                  >
                    <View style={styles.inputRow}>
                      <TextInput
                        style={styles.nameInput}
                        value={allocation.name}
                        onChangeText={(value) => updateAllocation(allocation.id, 'name', value)}
                        placeholder="Goal name"
                        placeholderTextColor="#999"
                      />
                      <TouchableOpacity
                        style={[
                          styles.amountInputContainer,
                          focusedField?.type === 'allocation' && focusedField?.id === allocation.id && styles.amountInputFocused,
                        ]}
                        onPress={() => setFocusedField({ type: 'allocation', id: allocation.id })}
                      >
                        <Text style={styles.dollarSign}>$</Text>
                        <Text style={[
                          styles.amountInput,
                          !allocation.amount && styles.amountPlaceholder,
                        ]}>
                          {allocation.amount ? formatNumberWithCommas(allocation.amount) : '0.00'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {amt > 0 && (
                      <Text style={styles.allocationPercentages}>
                        {pctOfIncome.toFixed(1)}% of income{disposableIncome > 0 ? ` · ${pctOfDisposable.toFixed(1)}% of disposable` : ''}
                      </Text>
                    )}
                  </View>
                </Swipeable>
              );
            })}

            <TouchableOpacity style={styles.addButton} onPress={addAllocation}>
              <Ionicons name="add-circle" size={20} color="#355e3b" />
              <Text style={styles.addButtonText}>Add Goal</Text>
            </TouchableOpacity>

            {/* Allocation Summary */}
            <View style={styles.allocationSummary}>
              <View style={styles.allocationSummaryRow}>
                <Text style={styles.allocationSummaryLabel}>Total Goals</Text>
                <Text style={styles.allocationSummaryValue}>
                  {formatCurrency(totalAllocated)}
                </Text>
              </View>
              {totalAllocated > disposableIncome && disposableIncome > 0 && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={20} color="#DC3545" />
                  <Text style={styles.warningText}>
                    Your goals exceed your disposable income.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Ideal Monthly Budget */}
          <View style={styles.idealBudgetCard}>
            <Text style={styles.idealBudgetLabel}>Ideal Monthly Budget</Text>
            <Text style={styles.idealBudgetAmount}>
              {formatCurrency(disposableIncome - totalAllocated)}
            </Text>
            <Text style={styles.idealBudgetSubtext}>
              Disposable income after savings goals
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Calculator Keypad */}
        {focusedField && (
          <View style={styles.calculatorContainer}>
            <View style={styles.calculatorHeader}>
              <Text style={styles.calculatorTitle}>
                {focusedField.type === 'income' ? 'Enter Income Amount' : focusedField.type === 'expense' ? 'Enter Expense Amount' : 'Enter Goal Amount'}
              </Text>
              <TouchableOpacity onPress={handleDoneCalculator} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
            <CalculatorKeypad
              amount={getCurrentAmount()}
              onNumberPress={handleNumberPress}
              onDecimalPress={handleDecimalPress}
              onBackspace={handleBackspace}
              onClear={handleClear}
            />
          </View>
        )}
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
  scrollView: {
    flex: 1,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#355e3b',
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    width: 120,
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  swipeDeleteAction: {
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 8,
    marginBottom: 12,
  },
  swipeDeleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#355e3b',
    fontWeight: '600',
  },
  sectionTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  sectionTotalIncome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#355e3b',
  },
  sectionTotalExpense: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC3545',
  },
  disposableCard: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  disposableLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  disposableAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#355e3b',
  },
  disposableWarning: {
    width: '100%',
    fontSize: 13,
    color: '#DC3545',
    marginTop: 8,
  },
  summaryNegative: {
    color: '#DC3545',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#DC3545',
    lineHeight: 20,
  },
  allocationsSection: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  allocationItem: {
    marginBottom: 12,
  },
  allocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  allocationPercentages: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginLeft: 22,
  },
  allocationSummary: {
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  allocationSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  allocationSummaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  allocationSummaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  idealBudgetCard: {
    backgroundColor: '#355e3b',
    marginTop: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  idealBudgetLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 8,
  },
  idealBudgetAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  idealBudgetSubtext: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.7,
  },
  bottomSpacer: {
    height: 40,
  },
  amountInputFocused: {
    borderColor: '#355e3b',
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  amountPlaceholder: {
    color: '#999',
  },
  calculatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  calculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#355e3b',
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
