import { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudget } from '@/hooks/useBudget';
import { Expense } from '@/types/database';
import SpendingCalendar from '@/components/SpendingCalendar';
import SpendingLineChart from '@/components/SpendingLineChart';
import CategoryPieChart from '@/components/CategoryPieChart';

export default function ChartsScreen() {
  // Calculate current month in YYYY-MM format
  const currentMonth = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  // Selected month state (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Format selected month for display (e.g., "December 2025")
  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() - 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() + 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  // Use database hooks
  const { expenses, loading: expensesLoading, refreshExpenses } = useExpenses();
  const { budget, loading: budgetLoading, refreshBudget } = useBudget(selectedMonth);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshExpenses();
      refreshBudget();
    }, [refreshExpenses, refreshBudget])
  );

  // Filter expenses to selected month
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseYear = expense.date.getFullYear();
      const expenseMonth = String(expense.date.getMonth() + 1).padStart(2, '0');
      const expenseMonthKey = `${expenseYear}-${expenseMonth}`;
      return expenseMonthKey === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Get days in selected month
  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month), 0);
    return date.getDate();
  }, [selectedMonth]);

  // Calculate daily expense totals
  const dailyTotals = useMemo(() => {
    const totals: { [day: number]: number } = {};
    filteredExpenses.forEach((expense) => {
      const day = expense.date.getDate();
      totals[day] = (totals[day] || 0) + parseFloat(expense.amount);
    });
    return totals;
  }, [filteredExpenses]);

  // Calculate cumulative spending by day
  const cumulativeSpending = useMemo(() => {
    const cumulative: number[] = [];
    let runningTotal = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      runningTotal += dailyTotals[day] || 0;
      cumulative.push(runningTotal);
    }
    return cumulative;
  }, [dailyTotals, daysInMonth]);

  // Calculate ideal spending (cumulative)
  const idealSpending = useMemo(() => {
    if (!budget) return [];
    const dailyBudget = parseFloat(budget.budgetAmount) / daysInMonth;
    const ideal: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      ideal.push(dailyBudget * day);
    }
    return ideal;
  }, [budget, daysInMonth]);

  const isLoading = expensesLoading || budgetLoading;
  const hasExpenses = filteredExpenses.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.monthSelector}>
              <TouchableOpacity
                style={styles.monthArrow}
                onPress={goToPreviousMonth}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{monthLabel}</Text>
              <TouchableOpacity
                style={styles.monthArrow}
                onPress={goToNextMonth}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#355e3b" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : !hasExpenses ? (
          <View style={styles.content}>
            <Text style={styles.emptyText}>
              No expenses for {monthLabel}. Add expenses to see spending insights.
            </Text>
          </View>
        ) : (
          <>
            {/* Calendar View */}
            <SpendingCalendar month={selectedMonth} expenses={filteredExpenses} />

            {/* Line Graph */}
            {budget && (
              <SpendingLineChart
                daysInMonth={daysInMonth}
                cumulativeSpending={cumulativeSpending}
                budgetAmount={parseFloat(budget.budgetAmount)}
                idealSpending={idealSpending}
              />
            )}
            {!budget && (
              <View style={styles.noBudgetContainer}>
                <Text style={styles.noBudgetText}>
                  Set a budget for {monthLabel} to see spending trends and comparisons.
                </Text>
              </View>
            )}

            {/* Pie Chart */}
            <CategoryPieChart expenses={filteredExpenses} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthArrow: {
    padding: 4,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    minWidth: 160,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  noBudgetContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  noBudgetText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
