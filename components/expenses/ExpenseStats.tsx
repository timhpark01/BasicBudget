import { StyleSheet, Text, View } from 'react-native';
import BudgetProgressBar from '@/components/shared/BudgetProgressBar';
import { Expense, CategoryBudget } from '@/types/database';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface ExpenseStatsProps {
  totalAmount: number;
  budget: { budgetAmount: string; month: string } | null;
  budgetLoading: boolean;
  selectedMonth: string;
  filteredExpenses: Expense[];
  categoryBudgets: CategoryBudget[];
  onSetCategoryBudget: (categoryId: string, budgetAmount: string) => Promise<void>;
  onDeleteCategoryBudget: (categoryId: string) => Promise<void>;
  allCategoryBudgets: CategoryBudget[];
  onSetCategoryBudgetForMonth: (month: string, categoryId: string, budgetAmount: string) => Promise<void>;
  onDeleteCategoryBudgetForMonth: (month: string, categoryId: string) => Promise<void>;
}

export default function ExpenseStats({
  totalAmount,
  budget,
  budgetLoading,
  selectedMonth,
  filteredExpenses,
  categoryBudgets,
  onSetCategoryBudget,
  onDeleteCategoryBudget,
  allCategoryBudgets,
  onSetCategoryBudgetForMonth,
  onDeleteCategoryBudgetForMonth,
}: ExpenseStatsProps) {
  return (
    <>
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Expenses</Text>
        <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatCurrency(totalAmount)}</Text>
      </View>

      {/* Budget Progress Bar */}
      {budget && !budgetLoading && budget.month === selectedMonth && (
        <BudgetProgressBar
          key={selectedMonth}
          totalExpenses={totalAmount}
          budgetAmount={parseFloat(budget.budgetAmount)}
          expenses={filteredExpenses}
          month={selectedMonth}
          categoryBudgets={categoryBudgets}
          onSetCategoryBudget={onSetCategoryBudget}
          onDeleteCategoryBudget={onDeleteCategoryBudget}
          allCategoryBudgets={allCategoryBudgets}
          onSetCategoryBudgetForMonth={onSetCategoryBudgetForMonth}
          onDeleteCategoryBudgetForMonth={onDeleteCategoryBudgetForMonth}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
  },
});
