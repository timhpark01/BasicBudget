import AddExpenseModal from '@/components/modals/expenses/AddExpenseModal';
import BudgetModal from '@/components/modals/budget/BudgetModal';
import UndoToast from '@/components/shared/UndoToast';
import WelcomeModal from '@/components/modals/WelcomeModal';
import ExpenseMonthHeader from '@/components/expenses/ExpenseMonthHeader';
import ExpenseStats from '@/components/expenses/ExpenseStats';
import ExpenseList from '@/components/expenses/ExpenseList';
import RecurringExpenseList from '@/components/recurring-expenses/RecurringExpenseList';
import { useExpenseMonth } from '@/components/expenses/useExpenseMonth';
import { useBudget } from '@/hooks/useBudget';
import { useCategoryBudgets } from '@/hooks/useCategoryBudgets';
import { useExpenses } from '@/hooks/useExpenses';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useRecurringExpenseGeneration } from '@/hooks/useRecurringExpenseGeneration';
import {
  deleteCategoryBudget as deleteCategoryBudgetDb,
  getCategoryBudgetsForMonth,
  setCategoryBudget as setCategoryBudgetDb,
} from '@/lib/db/models/category-budgets';
import { getAllBudgets } from '@/lib/db/models/budgets';
import { getDatabase } from '@/lib/db/core/database';
import { isFirstLaunch, markFirstLaunchComplete } from '@/lib/storage/first-launch';
import { Expense } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale, scaleFontSize, scaleWidth } from '@/lib/utils/responsive';
import { formatCurrency } from '@/lib/utils/number-formatter';

export default function BudgetsScreen() {
  // Responsive sizing
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Month navigation
  const { selectedMonth, monthLabel, goToPreviousMonth, goToNextMonth, setMonth } = useExpenseMonth();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);

  // Recurring expenses state
  const [recurringCollapsed, setRecurringCollapsed] = useState(false);

  // Undo state
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Use database hooks
  const {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refreshExpenses,
  } = useExpenses();
  const {
    budget,
    loading: budgetLoading,
    setBudget,
  } = useBudget(selectedMonth);
  const {
    categoryBudgets,
    setCategoryBudget,
    deleteCategoryBudget,
  } = useCategoryBudgets(selectedMonth);

  // Recurring expenses hooks
  const {
    recurringExpenses,
    addRecurringExpense,
    deleteRecurringExpense,
    toggleActive,
    refreshRecurringExpenses,
  } = useRecurringExpenses();

  // Auto-generate due recurring expenses
  useRecurringExpenseGeneration(refreshExpenses);

  // State for all category budgets (for analytics)
  const [allCategoryBudgets, setAllCategoryBudgets] = useState<any[]>([]);

  // State for previous month's budget (for auto-populating future months)
  const [previousBudget, setPreviousBudget] = useState<string | null>(null);

  // Load all category budgets for analytics
  useEffect(() => {
    async function loadAllCategoryBudgets() {
      try {
        const db = await getDatabase();
        const months = new Set<string>();
        expenses.forEach((expense) => {
          const year = expense.date.getFullYear();
          const month = String(expense.date.getMonth() + 1).padStart(2, '0');
          months.add(`${year}-${month}`);
        });

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

  // Load previous budget for auto-populating future months
  useEffect(() => {
    async function loadPreviousBudget() {
      try {
        const db = await getDatabase();
        const allBudgets = await getAllBudgets(db);

        // Filter budgets from months before the selected month
        const previousBudgets = allBudgets
          .filter((b) => b.month < selectedMonth)
          .sort((a, b) => b.month.localeCompare(a.month));

        // Use the most recent budget if found
        if (previousBudgets.length > 0) {
          setPreviousBudget(previousBudgets[0].budgetAmount);
        } else {
          setPreviousBudget(null);
        }
      } catch (error) {
        console.error('Failed to load previous budget:', error);
        setPreviousBudget(null);
      }
    }
    loadPreviousBudget();
  }, [selectedMonth, budget]);

  // Handler to set category budget for any month
  const handleSetCategoryBudgetForMonth = async (
    month: string,
    categoryId: string,
    budgetAmount: string
  ) => {
    try {
      if (month === selectedMonth) {
        await setCategoryBudget(categoryId, budgetAmount);
      } else {
        const db = await getDatabase();
        await setCategoryBudgetDb(db, { month, categoryId, budgetAmount });
      }

      const db = await getDatabase();
      const monthBudgets = await getCategoryBudgetsForMonth(db, month);
      setAllCategoryBudgets((prev) => {
        const filtered = prev.filter((b) => b.month !== month);
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
      if (month === selectedMonth) {
        await deleteCategoryBudget(categoryId);
      } else {
        const db = await getDatabase();
        await deleteCategoryBudgetDb(db, month, categoryId);
      }

      setAllCategoryBudgets((prev) =>
        prev.filter((b) => !(b.month === month && b.categoryId === categoryId))
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
          setWelcomeModalVisible(true);
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

    return Object.entries(groups).sort((a, b) => {
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }, [filteredExpenses]);

  // Calculate total for selected month
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  }, [filteredExpenses]);

  // Expense handlers
  const handleExpenseLongPress = (expense: Expense) => {
    Alert.alert(
      'Expense Options',
      `${expense.category.name} - ${formatCurrency(expense.amount)}`,
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
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
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
    ]);
  };

  const handleExpenseTap = (expense: Expense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingExpense(expense);
    setModalVisible(true);
  };

  const handleDeleteWithUndo = async (expenseId: string, expense: Expense) => {
    setDeletedExpense(expense);

    try {
      await deleteExpense(expenseId);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      Alert.alert('Error', 'Failed to delete expense. Please try again.');
      return;
    }

    setUndoVisible(true);

    setTimeout(() => {
      setDeletedExpense(null);
    }, 4000);
  };

  const handleUndo = async () => {
    if (!deletedExpense) return;

    setUndoVisible(false);

    try {
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

  const handleSwipeDelete = (expense: Expense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleDeleteWithUndo(expense.id, expense);
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

  // Recurring expense handlers
  const handleRecurringDelete = (id: string) => {
    Alert.alert(
      'Delete Recurring Expense',
      'What would you like to do?',
      [
        {
          text: 'Keep Generated Expenses',
          onPress: async () => {
            try {
              await deleteRecurringExpense(id, false);
              await refreshRecurringExpenses();
            } catch (err) {
              console.error('Failed to delete recurring expense:', err);
              Alert.alert('Error', 'Failed to delete recurring expense. Please try again.');
            }
          },
        },
        {
          text: 'Delete All Expenses',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecurringExpense(id, true);
              await refreshRecurringExpenses();
              await refreshExpenses();
            } catch (err) {
              console.error('Failed to delete recurring expense and generated expenses:', err);
              Alert.alert('Error', 'Failed to delete. Please try again.');
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshExpenses();
    } catch (err) {
      console.error('Failed to refresh expenses:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const fabSize = scaleWidth(56);
  const fabIconSize = scaleWidth(28);
  const fabBottom = moderateScale(100); // Fixed position, no longer moves
  const fabRight = moderateScale(20);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: fabSize + moderateScale(120) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#355e3b']}
            tintColor="#355e3b"
          />
        }
      >
        <View style={styles.header}>
          <ExpenseMonthHeader
            selectedMonth={selectedMonth}
            monthLabel={monthLabel}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
            onMonthChange={setMonth}
            onEditBudget={() => setBudgetModalVisible(true)}
            hasBudget={!!budget}
          />

          <ExpenseStats
            totalAmount={totalAmount}
            budget={budget}
            budgetLoading={budgetLoading}
            selectedMonth={selectedMonth}
            filteredExpenses={filteredExpenses}
            categoryBudgets={categoryBudgets}
            onSetCategoryBudget={setCategoryBudget}
            onDeleteCategoryBudget={deleteCategoryBudget}
            allCategoryBudgets={allCategoryBudgets}
            onSetCategoryBudgetForMonth={handleSetCategoryBudgetForMonth}
            onDeleteCategoryBudgetForMonth={handleDeleteCategoryBudgetForMonth}
          />
        </View>

        {/* Recurring Expenses Section */}
        <View style={styles.recurringSection}>
          <TouchableOpacity
            style={styles.recurringSectionHeader}
            onPress={() => setRecurringCollapsed(!recurringCollapsed)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons
                name={recurringCollapsed ? 'chevron-forward' : 'chevron-down'}
                size={20}
                color="#666"
              />
              <Text style={styles.sectionHeaderText}>
                Recurring Expenses ({recurringExpenses.filter(r => r.isActive).length})
              </Text>
            </View>
          </TouchableOpacity>

          {!recurringCollapsed && (
            <RecurringExpenseList
              recurringExpenses={recurringExpenses}
              onEdit={(recurring) => {
                Alert.alert('Edit Recurring Expense', 'Editing recurring expenses is not yet supported. You can delete and recreate it, or toggle it off/on.');
              }}
              onDelete={handleRecurringDelete}
              onToggleActive={toggleActive}
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
          <ExpenseList
            groupedExpenses={groupedExpenses}
            onExpenseTap={handleExpenseTap}
            onExpenseLongPress={handleExpenseLongPress}
            onSwipeDelete={handleSwipeDelete}
            budget={budget}
            selectedMonth={selectedMonth}
          />
        )}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: fabBottom,
            right: fabRight,
            width: fabSize,
            height: fabSize,
            borderRadius: fabSize / 2,
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={fabIconSize} color="#fff" />
      </TouchableOpacity>

      <UndoToast
        visible={undoVisible}
        message="Expense deleted"
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
      />

      <WelcomeModal visible={welcomeModalVisible} onNext={handleWelcomeNext} />

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
              await updateExpense(editingExpense.id, expense);
            } else {
              await addExpense(expense);
            }
            setModalVisible(false);
            setEditingExpense(null);
          } catch (err) {
            console.error('Failed to save expense:', err);
            Alert.alert('Error', 'Failed to save expense. Please try again.');
          }
        }}
        onCategoryChanged={async (categoryId) => {
          await refreshExpenses();
        }}
        onSaveRecurring={async (recurringExpense) => {
          try {
            await addRecurringExpense(recurringExpense);
            await refreshRecurringExpenses();
            setModalVisible(false);
          } catch (err) {
            console.error('Failed to save recurring expense:', err);
            Alert.alert('Error', 'Failed to save recurring expense. Please try again.');
          }
        }}
      />

      <BudgetModal
        visible={budgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
        currentBudget={budget?.budgetAmount}
        previousBudget={previousBudget}
        monthLabel={monthLabel}
        onSave={handleSaveBudget}
      />
    </SafeAreaView>
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
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  recurringSection: {
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(8),
  },
  recurringSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(4),
    marginBottom: moderateScale(8),
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: scaleFontSize(16),
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
    marginTop: moderateScale(16),
    fontSize: scaleFontSize(16),
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: moderateScale(16),
    fontSize: scaleFontSize(16),
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: moderateScale(16),
    paddingHorizontal: moderateScale(24),
    paddingVertical: moderateScale(12),
    backgroundColor: '#355e3b',
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: '#fff',
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    backgroundColor: '#355e3b',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
