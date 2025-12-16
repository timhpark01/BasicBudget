import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CalculatorKeypad from './CalculatorKeypad';

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

type FocusedField = {
  type: 'income' | 'expense';
  id: string;
} | null;

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
    } else {
      const expense = expenses.find(e => e.id === focusedField.id);
      return expense?.amount || '0';
    }
  };

  // Update focused field amount
  const updateFocusedAmount = (newAmount: string) => {
    if (!focusedField) return;

    if (focusedField.type === 'income') {
      updateIncome(focusedField.id, 'amount', newAmount);
    } else {
      updateExpense(focusedField.id, 'amount', newAmount);
    }
  };

  // Calculator keypad handlers
  const handleNumberPress = (num: string) => {
    const currentAmount = getCurrentAmount();
    if (currentAmount === '0') {
      updateFocusedAmount(num);
    } else {
      updateFocusedAmount(currentAmount + num);
    }
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
          },
        },
      ]
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

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Income Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash" size={24} color="#355e3b" />
              <Text style={styles.sectionTitle}>Monthly Income</Text>
            </View>

            {incomes.map((income) => (
              <View key={income.id} style={styles.inputRow}>
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
                    {income.amount || '0.00'}
                  </Text>
                </TouchableOpacity>
                {incomes.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeIncome(income.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="remove-circle" size={24} color="#DC3545" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addIncome}>
              <Ionicons name="add-circle" size={20} color="#355e3b" />
              <Text style={styles.addButtonText}>Add Income Source</Text>
            </TouchableOpacity>
          </View>

          {/* Expenses Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt" size={24} color="#DC3545" />
              <Text style={styles.sectionTitle}>Fixed Monthly Expenses</Text>
            </View>

            {expenses.map((expense) => (
              <View key={expense.id} style={styles.inputRow}>
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
                    {expense.amount || '0.00'}
                  </Text>
                </TouchableOpacity>
                {expenses.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeExpense(expense.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="remove-circle" size={24} color="#DC3545" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addButton} onPress={addExpense}>
              <Ionicons name="add-circle" size={20} color="#355e3b" />
              <Text style={styles.addButtonText}>Add Fixed Expense</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Section */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Monthly Income</Text>
              <Text style={styles.summaryIncome}>
                ${totalIncome.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Fixed Expenses</Text>
              <Text style={styles.summaryExpense}>
                -${totalExpenses.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Disposable Income</Text>
              <Text
                style={[
                  styles.summaryDisposable,
                  disposableIncome < 0 && styles.summaryNegative,
                ]}
              >
                ${disposableIncome.toFixed(2)}
              </Text>
            </View>

            {disposableIncome > 0 && (
              <View style={styles.tipBox}>
                <Ionicons name="bulb" size={20} color="#355e3b" />
                <Text style={styles.tipText}>
                  This is the amount available for variable expenses, savings, and
                  discretionary spending.
                </Text>
              </View>
            )}

            {disposableIncome < 0 && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color="#DC3545" />
                <Text style={styles.warningText}>
                  Your expenses exceed your income. Consider reducing fixed expenses
                  or finding additional income sources.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Calculator Keypad */}
        {focusedField && (
          <View style={styles.calculatorContainer}>
            <View style={styles.calculatorHeader}>
              <Text style={styles.calculatorTitle}>
                {focusedField.type === 'income' ? 'Enter Income Amount' : 'Enter Expense Amount'}
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
  removeButton: {
    padding: 4,
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
  summarySection: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryLabelBold: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  summaryIncome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#355e3b',
  },
  summaryExpense: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC3545',
  },
  summaryDisposable: {
    fontSize: 20,
    fontWeight: '700',
    color: '#355e3b',
  },
  summaryNegative: {
    color: '#DC3545',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#355e3b',
    lineHeight: 20,
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
