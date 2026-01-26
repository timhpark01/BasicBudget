import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Expense } from '@/types/database';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface ExpenseListProps {
  groupedExpenses: [string, Expense[]][];
  onExpenseTap: (expense: Expense) => void;
  onExpenseLongPress: (expense: Expense) => void;
  onSwipeDelete: (expense: Expense) => void;
  budget?: { budgetAmount: string } | null;
  selectedMonth: string;
}

export default function ExpenseList({
  groupedExpenses,
  onExpenseTap,
  onExpenseLongPress,
  onSwipeDelete,
  budget,
  selectedMonth,
}: ExpenseListProps) {
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Calculate ideal spend per day
  const getIdealSpendPerDay = () => {
    if (!budget?.budgetAmount) return null;

    const [year, month] = selectedMonth.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    return parseFloat(budget.budgetAmount) / daysInMonth;
  };

  const idealSpendPerDay = getIdealSpendPerDay();

  const toggleDateCollapse = (dateKey: string) => {
    setCollapsedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getDayTotal = (dayExpenses: Expense[]) => {
    return dayExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    expense: Expense
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.deleteAction,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.deleteActionButton}
          onPress={() => onSwipeDelete(expense)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={24} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.expensesList}>
      {groupedExpenses.map(([dateKey, dayExpenses]) => {
        const isCollapsed = collapsedDates.has(dateKey);
        const dayTotal = getDayTotal(dayExpenses);
        const exceedsIdeal = idealSpendPerDay !== null && dayTotal > idealSpendPerDay;

        return (
          <View key={dateKey} style={styles.dateSection}>
            <TouchableOpacity
              style={styles.dateHeader}
              onPress={() => toggleDateCollapse(dateKey)}
              activeOpacity={0.7}
            >
              <View style={styles.dateHeaderLeft}>
                <Ionicons
                  name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                  size={16}
                  color="#666"
                />
                <Text style={styles.dateHeaderText}>
                  {formatDateHeader(dateKey)}
                </Text>
              </View>
              <Text style={[
                styles.dateTotalText,
                exceedsIdeal && styles.dateTotalTextOver
              ]}>
                {formatCurrency(dayTotal)}
              </Text>
            </TouchableOpacity>

            {!isCollapsed && (
              <View style={styles.expensesContainer}>
                {dayExpenses.map((expense, index) => (
                  <Swipeable
                    key={expense.id}
                    renderRightActions={(progress, dragX) =>
                      renderRightActions(progress, dragX, expense)
                    }
                    overshootRight={false}
                  >
                    <TouchableOpacity
                      style={[
                        styles.expenseItem,
                        index === 0 && styles.expenseItemFirst,
                        index === dayExpenses.length - 1 && styles.expenseItemLast,
                        index !== 0 && styles.expenseItemNotFirst,
                      ]}
                      onPress={() => onExpenseTap(expense)}
                      onLongPress={() => onExpenseLongPress(expense)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: expense.category.color + '20' },
                        ]}
                      >
                        <Ionicons
                          name={expense.category.icon}
                          size={20}
                          color={expense.category.color}
                        />
                      </View>
                      <View style={styles.expenseDetails}>
                        <View style={styles.categoryNameRow}>
                          <Text style={styles.expenseCategoryText} numberOfLines={1} ellipsizeMode="tail">
                            {expense.category.name}
                          </Text>
                          {expense.recurringExpenseId && (
                            <Ionicons
                              name="repeat-outline"
                              size={14}
                              color="#666"
                              style={styles.recurringIcon}
                            />
                          )}
                        </View>
                        {expense.note ? (
                          <Text style={styles.expenseNoteText}>{expense.note}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.expenseAmount}>
                        {formatCurrency(expense.amount)}
                      </Text>
                    </TouchableOpacity>
                  </Swipeable>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  expensesList: {
    flex: 1,
  },
  dateSection: {
    marginBottom: 2,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dateTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#355e3b',
  },
  dateTotalTextOver: {
    color: '#DC3545',
  },
  expensesContainer: {
    gap: 0,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  expenseItemFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  expenseItemLast: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  expenseItemNotFirst: {
    borderTopWidth: 0,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseDetails: {
    flex: 1,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recurringIcon: {
    marginLeft: 2,
  },
  expenseCategoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  expenseNoteText: {
    fontSize: 13,
    color: '#666',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  deleteAction: {
    backgroundColor: '#DC3545',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
