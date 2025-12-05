import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CalculatorKeypad from './CalculatorKeypad';

interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  currentBudget?: string | null;
  monthLabel: string; // Display label like "December 2025"
  onSave: (budgetAmount: string) => void | Promise<void>;
}

export default function BudgetModal({
  visible,
  onClose,
  currentBudget,
  monthLabel,
  onSave,
}: BudgetModalProps) {
  const [amount, setAmount] = useState('0');
  const [loading, setLoading] = useState(false);

  // Pre-fill form when editing existing budget
  useEffect(() => {
    if (currentBudget) {
      setAmount(currentBudget);
    } else {
      setAmount('0');
    }
  }, [currentBudget, visible]);

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
              <ActivityIndicator size="small" color="#2f95dc" />
            ) : (
              <Ionicons name="checkmark" size={28} color="#2f95dc" />
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
