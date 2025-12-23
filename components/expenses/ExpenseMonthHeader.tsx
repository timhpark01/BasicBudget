import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExpenseMonthHeaderProps {
  monthLabel: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onEditBudget: () => void;
  hasBudget: boolean;
}

export default function ExpenseMonthHeader({
  monthLabel,
  onPreviousMonth,
  onNextMonth,
  onEditBudget,
  hasBudget,
}: ExpenseMonthHeaderProps) {
  return (
    <View style={styles.headerTop}>
      <View style={styles.monthSelector}>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={onPreviousMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={onNextMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.editBudgetButton}
        onPress={onEditBudget}
        activeOpacity={0.7}
      >
        <Ionicons name="create-outline" size={20} color="#355e3b" />
        <Text style={styles.editBudgetText}>
          {hasBudget ? 'Edit Budget' : 'Set Budget'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthArrow: {
    padding: 4,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    minWidth: 160,
    textAlign: 'center',
  },
  editBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  editBudgetText: {
    fontSize: 14,
    color: '#355e3b',
    fontWeight: '600',
  },
});
