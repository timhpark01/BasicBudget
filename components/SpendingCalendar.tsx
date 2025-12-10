import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Expense } from '@/types/database';

interface SpendingCalendarProps {
  month: string; // YYYY-MM format
  expenses: Expense[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  total: number;
}

export default function SpendingCalendar({ month, expenses }: SpendingCalendarProps) {
  // Parse month string to Date
  const monthDate = useMemo(() => {
    const [year, monthNum] = month.split('-');
    return new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  }, [month]);

  // Create a map of daily totals
  const dailyTotals = useMemo(() => {
    const totals: { [key: string]: number } = {};
    expenses.forEach((expense) => {
      const dateKey = expense.date.toDateString();
      totals[dateKey] = (totals[dateKey] || 0) + parseFloat(expense.amount);
    });
    return totals;
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
      });
    }

    // Current month days
    for (let day = 1; day <= lastDate; day++) {
      const date = new Date(year, monthNum, day);
      const dateKey = date.toDateString();
      days.push({
        date,
        isCurrentMonth: true,
        total: dailyTotals[dateKey] || 0,
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
      });
    }

    return days;
  }, [monthDate, dailyTotals]);

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

          return (
            <View
              key={index}
              style={[
                styles.dateCell,
                !day.isCurrentMonth && styles.dateCellOtherMonth,
              ]}
            >
              <View
                style={[
                  styles.dateCellInner,
                  hasExpenses && styles.dateCellWithExpenses,
                  isToday && styles.dateCellToday,
                ]}
              >
                <Text
                  style={[
                    styles.dateCellText,
                    !day.isCurrentMonth && styles.dateCellTextOtherMonth,
                    hasExpenses && styles.dateCellTextWithExpenses,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {day.isCurrentMonth && day.total > 0 && (
                  <Text style={styles.amountText}>${day.total.toFixed(2)}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
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
  dateCellToday: {
    borderWidth: 2,
    borderColor: '#355e3b',
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
  amountText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#355e3b',
    marginTop: 2,
  },
});

