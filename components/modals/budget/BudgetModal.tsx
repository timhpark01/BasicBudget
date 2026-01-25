import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CalculatorKeypad from '@/components/shared/CalculatorKeypad';
import { canAddDecimalDigit } from '@/lib/utils/number-formatter';

// Maximum budget amount to prevent UI overflow (10 million)
const MAX_BUDGET = 9999999999999.99;

interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  currentBudget?: string | null;
  previousBudget?: string | null; // Most recent budget from previous months
  monthLabel: string; // Display label like "December 2025"
  onSave: (budgetAmount: string) => void | Promise<void>;
}

export default function BudgetModal({
  visible,
  onClose,
  currentBudget,
  previousBudget,
  monthLabel,
  onSave,
}: BudgetModalProps) {
  const [amount, setAmount] = useState('0');
  const [loading, setLoading] = useState(false);

  // Pre-fill form when editing existing budget or use previous budget
  useEffect(() => {
    if (currentBudget) {
      // Use current budget if it exists
      setAmount(currentBudget);
    } else if (previousBudget) {
      // Auto-populate with most recent previous budget
      setAmount(previousBudget);
    } else {
      setAmount('0');
    }
  }, [currentBudget, previousBudget, visible]);

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

    // Check if the new amount would exceed the maximum budget
    const newAmountNum = parseFloat(newAmount);
    if (!isNaN(newAmountNum) && newAmountNum > MAX_BUDGET) {
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

  const handleSave = async () => {
    // Validate amount is valid
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount greater than 0.');
      return;
    }

    // Show loading state while saving
    setLoading(true);

    try {
      await onSave(amount);

      // Reset form only after successful save
      setAmount('0');
    } catch (err) {
      // Error is handled by parent component
      console.error('Save failed:', err);
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>Set Budget</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#355e3b" />
            ) : (
              <Ionicons name="checkmark" size={28} color="#355e3b" />
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.infoContainer}>
            <Ionicons name="calendar-outline" size={32} color="#666" />
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Text style={styles.description}>
              Set your budget for this month to track your spending progress.
            </Text>
          </View>

          {/* Calculator Keypad */}
          <View style={styles.calculatorContainer}>
            <CalculatorKeypad
              amount={amount}
              onNumberPress={handleNumberPress}
              onDecimalPress={handleDecimalPress}
              onBackspace={handleBackspace}
              onClear={handleClear}
            />
          </View>
        </View>
      </View>
    </Modal>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  monthLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  calculatorContainer: {
    paddingBottom: 40,
  },
});
