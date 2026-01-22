import AddExpenseModal from '@/components/modals/expenses/AddExpenseModal';
import BudgetModal from '@/components/modals/budget/BudgetModal';
import ExpenseDetailModal from '@/components/modals/expenses/ExpenseDetailModal';
import UndoToast from '@/components/shared/UndoToast';
import WelcomeModal from '@/components/modals/WelcomeModal';
import ExpenseMonthHeader from '@/components/expenses/ExpenseMonthHeader';
import ExpenseStats from '@/components/expenses/ExpenseStats';
import ExpenseList from '@/components/expenses/ExpenseList';
import { useExpenseMonth } from '@/components/expenses/useExpenseMonth';
import { useBudget } from '@/hooks/useBudget';
import { useCategoryBudgets } from '@/hooks/useCategoryBudgets';
import { useExpenses } from '@/hooks/useExpenses';
import {
  deleteCategoryBudget as deleteCategoryBudgetDb,
  getCategoryBudgetsForMonth,
  setCategoryBudget as setCategoryBudgetDb,
} from '@/lib/db/models/category-budgets';
import { getDatabase } from '@/lib/db/core/database';
import { isFirstLaunch, markFirstLaunchComplete } from '@/lib/storage/first-launch';
import { Expense } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function BudgetsScreen() {
  // Responsive sizing
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Month navigation
  const { selectedMonth, monthLabel, goToPreviousMonth, goToNextMonth } = useExpenseMonth();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [welcomeModalVisible, setWelcomeModalVisible] = useState(false);

  // Undo state
  const [deletedExpense, setDeletedExpense] = useState<Expense | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);

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
    setDetailExpense(expense);
    setDetailModalVisible(true);
  };

  const handleEditFromDetail = (expense: Expense) => {
    setDetailModalVisible(false);
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

  const handleSaveBudget = async (budgetAmount: string) => {
    try {
      await setBudget(budgetAmount);
      setBudgetModalVisible(false);
    } catch (err) {
      console.error('Failed to save budget:', err);
      Alert.alert('Error', 'Failed to save budget. Please try again.');
    }
  };

  const fabSize = scaleWidth(56);
  const fabIconSize = scaleWidth(28);
  const fabBottom = undoVisible ? moderateScale(140) : moderateScale(100);
  const fabRight = moderateScale(20);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: fabSize + moderateScale(120) }}
      >
        <View style={styles.header}>
          <ExpenseMonthHeader
            monthLabel={monthLabel}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
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
