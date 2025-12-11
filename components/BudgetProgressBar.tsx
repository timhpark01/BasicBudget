import { StyleSheet, Text, View } from 'react-native';

interface BudgetProgressBarProps {
  totalExpenses: number;
  budgetAmount: number;
}

export default function BudgetProgressBar({
  totalExpenses,
  budgetAmount,
}: BudgetProgressBarProps) {
  // Calculate percentage (capped at 200% for display purposes)
  const percentage = Math.min((totalExpenses / budgetAmount) * 100, 200);
  const isOverBudget = totalExpenses > budgetAmount;
  const overagePercentage = isOverBudget
    ? Math.min(((totalExpenses - budgetAmount) / budgetAmount) * 100, 100)
    : 0;

  // Determine bar color
  const barColor = isOverBudget ? '#FF6B6B' : '#355e3b';

  return (
    <View style={styles.container}>
      {/* Budget header */}
      <View style={styles.header}>
        <Text style={styles.label}>Remaining Spending</Text>
        <Text style={[styles.amount, isOverBudget && styles.amountOver]}>
          ${(Math.max(0,budgetAmount - totalExpenses)).toFixed(2)} of ${budgetAmount.toFixed(2)}
        </Text>
      </View>

      {/* Progress bar background */}
      <View style={styles.progressBarBackground}>
        {/* Main progress bar (capped at 100%) */}
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />

        {/* Extended bar for overage (beyond 100%) */}
        {isOverBudget && (
          <View
            style={[
              styles.progressBarOverage,
              {
                width: `${overagePercentage}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        )}
      </View>

      {/* Status message */}
      {isOverBudget && (
        <Text style={styles.overBudgetText}>
          ${(totalExpenses - budgetAmount).toFixed(2)} over budget
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  amountOver: {
    color: '#FF6B6B',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressBarOverage: {
    height: '100%',
    borderRadius: 4,
    position: 'absolute',
    left: '100%',
    top: 0,
    opacity: 0.6,
  },
  overBudgetText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 6,
    fontWeight: '600',
  },
});
