import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AddExpenseModal from '@/components/AddExpenseModal';
import { useExpenses } from '@/hooks/useExpenses';
import { Expense } from '@/types/database';

export default function BudgetsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Use database hook instead of local state
  const { expenses, loading, error, addExpense, updateExpense, deleteExpense, refreshExpenses } =
    useExpenses();

  // Group expenses by date and sort
  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: Expense[] } = {};

    expenses.forEach((expense) => {
      const dateKey = expense.date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(expense);
    });

    // Sort dates (most recent first) and return array of [dateKey, expenses]
    return Object.entries(groups).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }, [expenses]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  }, [expenses]);

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

  const handleExpenseLongPress = (expense: Expense) => {
    Alert.alert(
      'Expense Options',
      `${expense.category.name} - $${expense.amount}`,
      [
        {
          text: 'Edit',
          onPress: () => {
            setEditingExpense(expense);
            setModalVisible(true);
          },
        },
        {
          text: 'Delete',
          onPress: () => handleDeleteExpense(expense.id),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDeleteExpense = (id: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(id);
            } catch (err) {
              console.error('Failed to delete expense:', err);
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.monthTitle}>December 2025</Text>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Expenses</Text>
            <Text style={styles.totalAmount}>${totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2f95dc" />
            <Text style={styles.loadingText}>Loading expenses...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>Failed to load expenses</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshExpenses}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.content}>
            <Text style={styles.emptyText}>
              No expenses yet. Tap + to add your first expense.
            </Text>
          </View>
        ) : (
          <View style={styles.expensesList}>
            {groupedExpenses.map(([dateKey, dayExpenses]) => {
              const isCollapsed = collapsedDates.has(dateKey);
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
                        size={20}
                        color="#666"
                      />
                      <Text style={styles.dateHeaderText}>
                        {formatDateHeader(dateKey)}
                      </Text>
                    </View>
                    <Text style={styles.dateTotalText}>
                      ${getDayTotal(dayExpenses).toFixed(2)}
                    </Text>
                  </TouchableOpacity>

                  {!isCollapsed && (
                    <View style={styles.expensesContainer}>
                      {dayExpenses.map((expense) => (
                        <TouchableOpacity
                          key={expense.id}
                          style={styles.expenseItem}
                          onLongPress={() => handleExpenseLongPress(expense)}
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
                              size={24}
                              color={expense.category.color}
                            />
                          </View>
                          <View style={styles.expenseDetails}>
                            <Text style={styles.expenseCategoryText}>
                              {expense.category.name}
                            </Text>
                            {expense.note ? (
                              <Text style={styles.expenseNoteText}>{expense.note}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.expenseAmount}>
                            ${expense.amount}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <AddExpenseModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingExpense(null);
        }}
        editExpense={editingExpense}
        onSave={async (expense) => {
          try {
            if (editingExpense) {
              // Update existing expense
              await updateExpense(editingExpense.id, expense);
            } else {
              // Add new expense
              await addExpense(expense);
            }
            setModalVisible(false);
            setEditingExpense(null);
          } catch (err) {
            console.error('Failed to save expense:', err);
            Alert.alert('Error', 'Failed to save expense. Please try again.');
          }
        }}
      />
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
  monthTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2f95dc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2f95dc',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2f95dc',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  expensesList: {
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  dateHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  dateTotalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  expensesContainer: {
    backgroundColor: '#fff',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseCategoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  expenseNoteText: {
    fontSize: 14,
    color: '#666',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});
