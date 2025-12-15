import AddExpenseModal from '@/components/AddExpenseModal';
import BudgetModal from '@/components/BudgetModal';
import BudgetProgressBar from '@/components/BudgetProgressBar';
import ExpenseDetailModal from '@/components/ExpenseDetailModal';
import UndoToast from '@/components/UndoToast';
import WelcomeModal from '@/components/WelcomeModal';
import { useBudget } from '@/hooks/useBudget';
import { useCategoryBudgets } from '@/hooks/useCategoryBudgets';
import { useExpenses } from '@/hooks/useExpenses';
import { isFirstLaunch, markFirstLaunchComplete } from '@/lib/first-launch';
import { Expense } from '@/types/database';
import { getDatabase } from '@/lib/database';
import { setCategoryBudget as setCategoryBudgetDb, deleteCategoryBudget as deleteCategoryBudgetDb, getCategoryBudgetsForMonth } from '@/lib/category-budgets-db';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

export default function BudgetsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);

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
  const {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    duplicateExpense,
    refreshExpenses,
  } = useExpenses();
  const {
    budget,
    loading: budgetLoading,
    setBudget,
    refreshBudget,
  } = useBudget(selectedMonth);
  const {
    categoryBudgets,
    setCategoryBudget,
    deleteCategoryBudget,
  } = useCategoryBudgets(selectedMonth);

  // State for all category budgets (for analytics)
  const [allCategoryBudgets, setAllCategoryBudgets] = useState<any[]>([]);

  // Load all category budgets for analytics
  useEffect(() => {
    async function loadAllCategoryBudgets() {
      try {
        const db = await getDatabase();
        // Get unique months from expenses
        const months = new Set<string>();
        expenses.forEach(expense => {
          const year = expense.date.getFullYear();
          const month = String(expense.date.getMonth() + 1).padStart(2, '0');
          months.add(`${year}-${month}`);
        });

        // Load budgets for all months
        const budgets: any[] = [];
        for (const month of months) {
          const monthBudgets = await getCategoryBudgetsForMonth(db, month);
          budgets.push(...monthBudgets);
        }
        setAllCategoryBudgets(budgets);
      } catch (error) {
        console.error('Failed to load all category budgets:', error);
      }
    }
    loadAllCategoryBudgets();
  }, [expenses, categoryBudgets]);

  // Handler to set category budget for any month
  const handleSetCategoryBudgetForMonth = async (month: string, categoryId: string, budgetAmount: string) => {
    try {
      // If updating the current month's budget, use the hook's method for proper state management
      if (month === selectedMonth) {
        await setCategoryBudget(categoryId, budgetAmount);
      } else {
        // For other months, update directly
        const db = await getDatabase();
        await setCategoryBudgetDb(db, { month, categoryId, budgetAmount });
      }

      // Refresh category budgets for all months (for analytics)
      const db = await getDatabase();
      const monthBudgets = await getCategoryBudgetsForMonth(db, month);
      setAllCategoryBudgets(prev => {
        const filtered = prev.filter(b => b.month !== month);
        return [...filtered, ...monthBudgets];
      });
    } catch (error) {
      console.error('Failed to set category budget:', error);
      Alert.alert('Error', 'Failed to save category budget. Please try again.');
    }
  };

  // Handler to delete category budget for any month
  const handleDeleteCategoryBudgetForMonth = async (month: string, categoryId: string) => {
    try {
      // If deleting the current month's budget, use the hook's method for proper state management
      if (month === selectedMonth) {
        await deleteCategoryBudget(categoryId);
      } else {
        // For other months, delete directly
        const db = await getDatabase();
        await deleteCategoryBudgetDb(db, month, categoryId);
      }

      // Update state for all months (for analytics)
      setAllCategoryBudgets(prev =>
        prev.filter(b => !(b.month === month && b.categoryId === categoryId))
      );
    } catch (error) {
      console.error('Failed to delete category budget:', error);
      Alert.alert('Error', 'Failed to delete category budget. Please try again.');
    }
  };

  // Check for first launch and show welcome screen
  useEffect(() => {
    async function checkFirstLaunch() {
      try {
        const isFirst = await isFirstLaunch();
        if (isFirst && !loading && !budgetLoading) {
          // Show welcome modal on first launch
          setWelcomeModalVisible(true);
          // Mark first launch as complete
          await markFirstLaunchComplete();
        }
      } catch (error) {
        console.error('Failed to check first launch:', error);
      }
    }
    checkFirstLaunch();
  }, [loading, budgetLoading]);

  // Handle welcome modal completion
  const handleWelcomeNext = () => {
    setWelcomeModalVisible(false);
    setBudgetModalVisible(true);
  };

  // Filter expenses to only include those from the selected month
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const expenseYear = expense.date.getFullYear();
      const expenseMonth = String(expense.date.getMonth() + 1).padStart(2, '0');
      const expenseMonthKey = `${expenseYear}-${expenseMonth}`;
      return expenseMonthKey === selectedMonth;
    });
  }, [expenses, selectedMonth]);

  // Group expenses by date and sort
  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: Expense[] } = {};

    filteredExpenses.forEach((expense) => {
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
  }, [filteredExpenses]);

  // Calculate total for selected month
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  }, [filteredExpenses]);

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
      `${expense.category.name} - $${parseFloat(expense.amount).toFixed(2)}`,
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

  const handleExpenseTap = (expense: Expense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailExpense(expense);
    setDetailModalVisible(true);
  };

  const handleEditFromDetail = (expense: Expense) => {
    setDetailModalVisible(false);
    setEditingExpense(expense);
    setModalVisible(true);
  };

  const handleDeleteWithUndo = async (expenseId: string, expense: Expense) => {
    // Store for undo
    setDeletedExpense(expense);

    // Delete immediately
    try {
      await deleteExpense(expenseId);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      Alert.alert('Error', 'Failed to delete expense. Please try again.');
      return;
    }

    // Show undo toast
    setUndoVisible(true);

    // Clear deleted expense after undo timeout
    setTimeout(() => {
      setDeletedExpense(null);
    }, 4000);
  };

  const handleUndo = async () => {
    if (!deletedExpense) return;

    setUndoVisible(false);

    try {
      // Re-add the expense
      await addExpense({
        amount: deletedExpense.amount,
        category: deletedExpense.category,
        date: deletedExpense.date,
        note: deletedExpense.note,
      });
    } catch (err) {
      console.error('Failed to undo delete:', err);
      Alert.alert('Error', 'Failed to restore expense. Please try again.');
    }

    setDeletedExpense(null);
  };

  const handleDuplicate = async (expense: Expense) => {
    setDetailModalVisible(false);
    try {
      await duplicateExpense(expense);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to duplicate expense:', err);
      Alert.alert('Error', 'Failed to duplicate expense. Please try again.');
    }
  };

  const handleSwipeDelete = (expense: Expense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleDeleteWithUndo(expense.id, expense);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    expense: Expense
  ) => {
    // Create smooth animations that follow the swipe gesture
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
          onPress={() => handleSwipeDelete(expense)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={24} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleSaveBudget = async (budgetAmount: string) => {
    try {
      await setBudget(budgetAmount);
      setBudgetModalVisible(false);
    } catch (err) {
      console.error('Failed to save budget:', err);
      Alert.alert('Error', 'Failed to save budget. Please try again.');
    }
  };

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
            <TouchableOpacity
              style={styles.editBudgetButton}
              onPress={() => setBudgetModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color="#355e3b" />
              <Text style={styles.editBudgetText}>
                {budget ? 'Edit Budget' : 'Set Budget'}
              </Text>
            </TouchableOpacity>
          </View>

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
              onSetCategoryBudget={setCategoryBudget}
              onDeleteCategoryBudget={deleteCategoryBudget}
              allCategoryBudgets={allCategoryBudgets}
              onSetCategoryBudgetForMonth={handleSetCategoryBudgetForMonth}
              onDeleteCategoryBudgetForMonth={handleDeleteCategoryBudgetForMonth}
            />
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#355e3b" />
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
        ) : filteredExpenses.length === 0 ? (
          <View style={styles.content}>
            <Text style={styles.emptyText}>
              No expenses for {monthLabel}. Tap + to add your first expense.
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
                        <Swipeable
                          key={expense.id}
                          renderRightActions={(progress, dragX) =>
                            renderRightActions(progress, dragX, expense)
                          }
                          overshootRight={false}
                        >
                          <TouchableOpacity
                            style={styles.expenseItem}
                            onPress={() => handleExpenseTap(expense)}
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
                              ${parseFloat(expense.amount).toFixed(2)}
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
        )}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          { bottom: undoVisible ? 60 : 20 } // Move up when toast is visible (toast height ~48 + 12 spacing)
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <WelcomeModal
        visible={welcomeModalVisible}
        onNext={handleWelcomeNext}
      />

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

      <BudgetModal
        visible={budgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
        currentBudget={budget?.budgetAmount}
        monthLabel={monthLabel}
        onSave={handleSaveBudget}
      />

      <ExpenseDetailModal
        visible={detailModalVisible}
        expense={detailExpense}
        onClose={() => setDetailModalVisible(false)}
        onEdit={handleEditFromDetail}
        onDelete={(id) => handleDeleteWithUndo(id, detailExpense!)}
        onDuplicate={handleDuplicate}
      />

      <UndoToast
        visible={undoVisible}
        message="Expense deleted"
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  editBudgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  editBudgetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#355e3b',
    marginLeft: 4,
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
    color: '#355e3b',
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
    backgroundColor: '#355e3b',
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
    backgroundColor: '#355e3b',
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
  deleteAction: {
    backgroundColor: '#FF6B6B',
    width: 80,
    height: '100%',
  },
  deleteActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
