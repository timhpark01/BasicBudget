import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense } from '@/types/database';

interface SpendingCalendarProps {
  month: string; // YYYY-MM format
  expenses: Expense[];
  budgetAmount?: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  total: number;
  expenses: Expense[];
}

export default function SpendingCalendar({ month, expenses, budgetAmount }: SpendingCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Parse month string to Date
  const monthDate = useMemo(() => {
    const [year, monthNum] = month.split('-');
    return new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  }, [month]);

  // Calculate ideal spending per day
  const idealDailySpending = useMemo(() => {
    if (!budgetAmount) return null;
    const [year, monthNum] = month.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    return budgetAmount / daysInMonth;
  }, [budgetAmount, month]);

  // Create a map of daily totals and expenses
  const dailyData = useMemo(() => {
    const data: { [key: string]: { total: number; expenses: Expense[] } } = {};
    expenses.forEach((expense) => {
      const dateKey = expense.date.toDateString();
      if (!data[dateKey]) {
        data[dateKey] = { total: 0, expenses: [] };
      }
      data[dateKey].total += parseFloat(expense.amount);
      data[dateKey].expenses.push(expense);
    });
    return data;
  }, [expenses]);

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const year = monthDate.getFullYear();
    const monthNum = monthDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, monthNum, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of the month
    const lastDay = new Date(year, monthNum + 1, 0);
    const lastDate = lastDay.getDate();

    // Previous month padding
    const prevMonthLastDay = new Date(year, monthNum, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, monthNum - 1, prevMonthLastDate - i);
      days.push({
        date,
        isCurrentMonth: false,
        total: 0,
        expenses: [],
      });
    }

    // Current month days
    for (let day = 1; day <= lastDate; day++) {
      const date = new Date(year, monthNum, day);
      const dateKey = date.toDateString();
      const dayData = dailyData[dateKey];
      days.push({
        date,
        isCurrentMonth: true,
        total: dayData?.total || 0,
        expenses: dayData?.expenses || [],
      });
    }

    // Next month padding to reach 42 cells
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, monthNum + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        total: 0,
        expenses: [],
      });
    }

    return days;
  }, [monthDate, dailyData]);

  return (
    <View style={styles.container}>
      {/* Day of week labels */}
      <View style={styles.dayLabelsContainer}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <View key={index} style={styles.dayLabel}>
            <Text style={styles.dayLabelText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Date grid */}
      <View style={styles.dateGrid}>
        {calendarDays.map((day, index) => {
          const hasExpenses = day.total > 0;
          const isToday =
            day.isCurrentMonth &&
            day.date.toDateString() === new Date().toDateString();
          const isSelected = selectedDay === day.date.toDateString();
          const isOverBudget =
            hasExpenses &&
            idealDailySpending !== null &&
            day.total > idealDailySpending;
          const isSelectedAndOverBudget = isSelected && isOverBudget;

          const handleDayPress = () => {
            if (hasExpenses && day.isCurrentMonth) {
              setSelectedDay(isSelected ? null : day.date.toDateString());
            }
          };

          return (
            <View
              key={index}
              style={[
                styles.dateCell,
                !day.isCurrentMonth && styles.dateCellOtherMonth,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.dateCellInner,
                  hasExpenses && styles.dateCellWithExpenses,
                  isOverBudget && styles.dateCellOverBudget,
                  isToday && styles.dateCellToday,
                  isSelected && styles.dateCellSelected,
                  isSelectedAndOverBudget && styles.dateCellSelectedOverBudget,
                ]}
                onPress={handleDayPress}
                disabled={!hasExpenses || !day.isCurrentMonth}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateCellText,
                    !day.isCurrentMonth && styles.dateCellTextOtherMonth,
                    hasExpenses && styles.dateCellTextWithExpenses,
                    isOverBudget && styles.dateCellTextOverBudget,
                    isSelected && styles.dateCellTextSelected,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {day.isCurrentMonth && day.total > 0 && (
                  <Text
                    style={[
                      styles.amountText,
                      isOverBudget && styles.amountTextOverBudget,
                      isSelected && styles.amountTextSelected,
                    ]}
                  >
                    ${day.total.toFixed(2)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Transaction List Dropdown */}
      {selectedDay && (
        <View style={styles.transactionsContainer}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>
              Transactions on {new Date(selectedDay).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedDay(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close-circle" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          {calendarDays
            .find((day) => day.date.toDateString() === selectedDay)
            ?.expenses.map((expense, idx) => (
              <View key={idx} style={styles.transactionItem}>
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: expense.category.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={expense.category.icon}
                    size={20}
                    color={expense.category.color}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionCategory}>
                    {expense.category.name}
                  </Text>
                  {expense.note && (
                    <Text style={styles.transactionNote}>{expense.note}</Text>
                  )}
                </View>
                <Text style={styles.transactionAmount}>
                  ${parseFloat(expense.amount).toFixed(2)}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  dayLabelsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dateCellOtherMonth: {
    opacity: 0.3,
  },
  dateCellInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  dateCellWithExpenses: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#355e3b',
  },
  dateCellOverBudget: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  dateCellToday: {
    borderWidth: 2,
    borderColor: '#355e3b',
  },
  dateCellSelected: {
    backgroundColor: '#355e3b',
  },
  dateCellSelectedOverBudget: {
    backgroundColor: '#DC3545',
  },
  dateCellText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dateCellTextOtherMonth: {
    color: '#999',
  },
  dateCellTextWithExpenses: {
    fontWeight: '600',
    color: '#355e3b',
  },
  dateCellTextOverBudget: {
    fontWeight: '600',
    color: '#DC3545',
  },
  dateCellTextSelected: {
    color: '#fff',
  },
  amountText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#355e3b',
    marginTop: 2,
  },
  amountTextOverBudget: {
    color: '#DC3545',
  },
  amountTextSelected: {
    color: '#fff',
  },
  transactionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transactionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  transactionNote: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

