import { StyleSheet, Text, View } from 'react-native';
import BudgetProgressBar from '@/components/shared/BudgetProgressBar';
import { Expense, CategoryBudget } from '@/types/database';

interface ExpenseStatsProps {
  totalAmount: number;
  budget: { budgetAmount: string; month: string } | null;
  budgetLoading: boolean;
  selectedMonth: string;
  filteredExpenses: Expense[];
  categoryBudgets: CategoryBudget[];
  onSetCategoryBudget: (categoryId: string, budgetAmount: string) => Promise<void>;
  onDeleteCategoryBudget: (categoryId: string) => Promise<void>;
  allCategoryBudgets: any[];
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
        <Text style={styles.totalAmount}>${totalAmount.toFixed(2)}</Text>
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
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
});
