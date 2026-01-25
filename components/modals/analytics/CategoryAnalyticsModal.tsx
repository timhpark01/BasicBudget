import { useEffect, useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Expense } from '@/types/database';
import { getDatabase } from '@/lib/db/core/database';
import { getExpensesByCategory } from '@/lib/db/models/expenses';
import CategoryBudgetModal from '@/components/modals/budget/CategoryBudgetModal';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface CategoryAnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categoryBudgets?: any[];
  onSetCategoryBudget?: (month: string, categoryId: string, budgetAmount: string) => Promise<void>;
  onDeleteCategoryBudget?: (month: string, categoryId: string) => Promise<void>;
}

interface Analytics {
  totalExpenses: number;
  transactionCount: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  stdDev: number;
  medianAmount: number;
  firstExpenseDate: Date | null;
  lastExpenseDate: Date | null;
}

export default function CategoryAnalyticsModal({
  visible,
  onClose,
  categoryId,
  categoryName,
  categoryIcon,
  categoryColor,
  categoryBudgets = [],
  onSetCategoryBudget,
  onDeleteCategoryBudget,
}: CategoryAnalyticsModalProps) {
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadExpenses();
    }
  }, [visible, categoryId]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const db = await getDatabase();
      const categoryExpenses = await getExpensesByCategory(db, categoryId);
      setExpenses(categoryExpenses);
    } catch (error) {
      console.error('Failed to load category expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const analytics: Analytics = useMemo(() => {
    if (expenses.length === 0) {
      return {
        totalExpenses: 0,
        transactionCount: 0,
        averageAmount: 0,
        minAmount: 0,
        maxAmount: 0,
        stdDev: 0,
        medianAmount: 0,
        firstExpenseDate: null,
        lastExpenseDate: null,
      };
    }

    const amounts = expenses.map((e) => parseFloat(e.amount));
    const totalExpenses = amounts.reduce((sum, amt) => sum + amt, 0);
    const transactionCount = amounts.length;
    const averageAmount = totalExpenses / transactionCount;

    // Standard deviation
    const variance =
      amounts.reduce((sum, amt) => sum + Math.pow(amt - averageAmount, 2), 0) /
      transactionCount;
    const stdDev = Math.sqrt(variance);

    // Min and Max
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);

    // Median
    const sortedAmounts = [...amounts].sort((a, b) => a - b);
    const mid = Math.floor(sortedAmounts.length / 2);
    const medianAmount =
      sortedAmounts.length % 2 === 0
        ? (sortedAmounts[mid - 1] + sortedAmounts[mid]) / 2
        : sortedAmounts[mid];

    // Dates
    const dates = expenses.map((e) => e.date.getTime());
    const firstExpenseDate = new Date(Math.min(...dates));
    const lastExpenseDate = new Date(Math.max(...dates));

    return {
      totalExpenses,
      transactionCount,
      averageAmount,
      minAmount,
      maxAmount,
      stdDev,
      medianAmount,
      firstExpenseDate,
      lastExpenseDate,
    };
  }, [expenses]);

  // Calculate monthly breakdown
  const monthlyBreakdown = useMemo(() => {
    const monthlyData: {
      [key: string]: {
        month: string;
        monthLabel: string;
        total: number;
        count: number;
        avgPerDay: number;
        daysInMonth: number;
      };
    } = {};

    expenses.forEach((expense) => {
      const year = expense.date.getFullYear();
      const month = expense.date.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        monthlyData[monthKey] = {
          month: monthKey,
          monthLabel: new Date(year, month, 1).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          }),
          total: 0,
          count: 0,
          avgPerDay: 0,
          daysInMonth,
        };
      }

      monthlyData[monthKey].total += parseFloat(expense.amount);
      monthlyData[monthKey].count += 1;
    });

    // Calculate avg per day for each month
    Object.values(monthlyData).forEach((data) => {
      data.avgPerDay = data.total / data.daysInMonth;
    });

    // Sort by month (most recent first)
    return Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
  }, [expenses]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get budget for a specific month
  const getBudgetForMonth = (month: string): string | null => {
    const budget = categoryBudgets.find(
      (b: any) => b.month === month && b.categoryId === categoryId
    );
    return budget ? budget.budgetAmount : null;
  };

  // Handle opening budget modal for a specific month
  const handleMonthPress = (month: string) => {
    if (!onSetCategoryBudget) return;
    setSelectedMonth(month);
    setBudgetModalVisible(true);
  };

  // Handle saving budget
  const handleSaveBudget = async (budgetAmount: string) => {
    if (!selectedMonth || !onSetCategoryBudget) return;
    await onSetCategoryBudget(selectedMonth, categoryId, budgetAmount);
  };

  // Handle deleting budget
  const handleDeleteBudget = async () => {
    if (!selectedMonth || !onDeleteCategoryBudget) return;
    await onDeleteCategoryBudget(selectedMonth, categoryId);
  };

  const StatCard = ({
    label,
    value,
    subtext,
    icon,
  }: {
    label: string;
    value: string;
    subtext?: string;
    icon?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={16}
            color="#666"
            style={styles.statIcon}
          />
        )}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <View style={styles.categoryInfo}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: categoryColor + '20' },
                ]}
              >
                <Ionicons
                  name={categoryIcon as any}
                  size={28}
                  color={categoryColor}
                />
              </View>
              <View>
                <Text style={styles.title}>{categoryName}</Text>
                <Text style={styles.subtitle}>Analytics</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={categoryColor} />
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          ) : expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No expenses found</Text>
              <Text style={styles.emptySubtext}>
                Add some expenses in this category to see analytics
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Overview Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.statsGrid}>
                  <StatCard
                    label="Total Spent"
                    value={formatCurrency(analytics.totalExpenses)}
                    icon="cash-outline"
                  />
                  <StatCard
                    label="Transactions"
                    value={analytics.transactionCount.toString()}
                    icon="list-outline"
                  />
                </View>
              </View>

              {/* Statistical Measures */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Statistical Measures</Text>
                <View style={styles.statsGrid}>
                  <StatCard
                    label="Average"
                    value={formatCurrency(analytics.averageAmount)}
                    subtext="per transaction"
                    icon="analytics-outline"
                  />
                  <StatCard
                    label="Median"
                    value={formatCurrency(analytics.medianAmount)}
                    subtext="middle value"
                    icon="remove-outline"
                  />
                  <StatCard
                    label="Std Deviation"
                    value={formatCurrency(analytics.stdDev)}
                    subtext="variability"
                    icon="stats-chart-outline"
                  />
                  <StatCard
                    label="Range"
                    value={formatCurrency(analytics.maxAmount - analytics.minAmount)}
                    subtext="max - min"
                    icon="swap-vertical-outline"
                  />
                </View>
              </View>

              {/* Min/Max Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Extremes</Text>
                <View style={styles.statsGrid}>
                  <StatCard
                    label="Minimum"
                    value={formatCurrency(analytics.minAmount)}
                    subtext="lowest transaction"
                    icon="trending-down-outline"
                  />
                  <StatCard
                    label="Maximum"
                    value={formatCurrency(analytics.maxAmount)}
                    subtext="highest transaction"
                    icon="trending-up-outline"
                  />
                </View>
              </View>

              {/* Timeline Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Timeline</Text>
                <View style={styles.statsGrid}>
                  <StatCard
                    label="First Expense"
                    value={formatDate(analytics.firstExpenseDate)}
                    icon="calendar-outline"
                  />
                  <StatCard
                    label="Latest Expense"
                    value={formatDate(analytics.lastExpenseDate)}
                    icon="time-outline"
                  />
                </View>
              </View>

              {/* Monthly Breakdown */}
              {monthlyBreakdown.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
                    {onSetCategoryBudget && (
                      <Text style={styles.sectionHint}>Tap to set budget</Text>
                    )}
                  </View>
                  <View style={styles.monthlyList}>
                    {monthlyBreakdown.map((monthData) => {
                      const monthBudget = getBudgetForMonth(monthData.month);
                      const budgetNum = monthBudget ? parseFloat(monthBudget) : null;
                      const isOverBudget = budgetNum !== null && monthData.total > budgetNum;

                      return (
                        <TouchableOpacity
                          key={monthData.month}
                          style={styles.monthlyItem}
                          onPress={() => handleMonthPress(monthData.month)}
                          disabled={!onSetCategoryBudget}
                          activeOpacity={0.7}
                        >
                          <View style={styles.monthlyHeader}>
                            <View style={styles.monthlyLeft}>
                              <Ionicons
                                name="calendar-outline"
                                size={16}
                                color={categoryColor}
                                style={styles.monthlyIcon}
                              />
                              <View>
                                <Text style={styles.monthlyLabel}>
                                  {monthData.monthLabel}
                                </Text>
                                <Text style={styles.monthlyCount}>
                                  {monthData.count} transaction{monthData.count !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.monthlyRight}>
                              <Text style={[
                                styles.monthlyTotal,
                                isOverBudget && styles.overBudgetText
                              ]}>
                                {formatCurrency(monthData.total)}
                                {budgetNum && ` / ${formatCurrency(budgetNum)}`}
                              </Text>
                              <Text style={styles.monthlyAvg}>
                                {formatCurrency(monthData.avgPerDay)}/day
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Insights */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Insights</Text>

                {/* Spending Pattern Insight */}
                <View style={styles.insightCard}>
                  <Ionicons
                    name="bulb-outline"
                    size={20}
                    color={categoryColor}
                    style={styles.insightIcon}
                  />
                  <View style={styles.insightContent}>
                    {analytics.stdDev > analytics.averageAmount * 0.5 ? (
                      <Text style={styles.insightText}>
                        Your spending in this category varies significantly. Consider
                        tracking individual transactions more closely.
                      </Text>
                    ) : (
                      <Text style={styles.insightText}>
                        Your spending in this category is relatively consistent at around
                        {formatCurrency(analytics.averageAmount)} per transaction.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Budget-Based Transaction Estimate */}
                {(() => {
                  // Get current month in YYYY-MM format
                  const now = new Date();
                  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  const currentMonthBudget = getBudgetForMonth(currentMonth);

                  if (currentMonthBudget && analytics.averageAmount > 0) {
                    const budgetNum = parseFloat(currentMonthBudget);
                    const currentMonthData = monthlyBreakdown.find(m => m.month === currentMonth);
                    const currentSpend = currentMonthData ? currentMonthData.total : 0;
                    const remainingBudget = budgetNum - currentSpend;
                    const estimatedTransactions = Math.floor(remainingBudget / analytics.averageAmount);

                    if (remainingBudget > 0) {
                      return (
                        <View style={styles.insightCard}>
                          <Ionicons
                            name="calculator-outline"
                            size={20}
                            color={categoryColor}
                            style={styles.insightIcon}
                          />
                          <View style={styles.insightContent}>
                            <Text style={styles.insightText}>
                              Based on your budget of {formatCurrency(budgetNum)} and average spending of {formatCurrency(analytics.averageAmount)} per transaction, you can make approximately{' '}
                              <Text style={styles.insightHighlight}>{estimatedTransactions}</Text> more
                              {estimatedTransactions === 1 ? ' transaction' : ' transactions'} this month.
                            </Text>
                          </View>
                        </View>
                      );
                    } else if (remainingBudget < 0) {
                      const overageTransactions = Math.floor(Math.abs(remainingBudget) / analytics.averageAmount);
                      return (
                        <View style={styles.insightCard}>
                          <Ionicons
                            name="warning-outline"
                            size={20}
                            color="#DC3545"
                            style={styles.insightIcon}
                          />
                          <View style={styles.insightContent}>
                            <Text style={styles.insightText}>
                              You've exceeded your budget by {formatCurrency(Math.abs(remainingBudget))}, which is approximately{' '}
                              <Text style={styles.insightHighlight}>{overageTransactions}</Text>
                              {overageTransactions === 1 ? ' transaction' : ' transactions'} worth based on your average.
                            </Text>
                          </View>
                        </View>
                      );
                    }
                  }
                  return null;
                })()}
              </View>
            </ScrollView>
          )}
      </View>

      {/* Category Budget Modal */}
      {selectedMonth && (
        <CategoryBudgetModal
          visible={budgetModalVisible}
          onClose={() => setBudgetModalVisible(false)}
          categoryName={categoryName}
          categoryIcon={categoryIcon}
          categoryColor={categoryColor}
          currentBudget={getBudgetForMonth(selectedMonth) || undefined}
          onSave={handleSaveBudget}
          onDelete={onDeleteCategoryBudget ? handleDeleteBudget : undefined}
          categoryId={categoryId}
          currentMonth={selectedMonth}
          allCategoryBudgets={categoryBudgets}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statCard: {
    width: '50%',
    padding: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statIcon: {
    marginRight: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: '#999',
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#355e3b',
  },
  insightIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  insightHighlight: {
    fontWeight: 'bold',
    color: '#333',
  },
  monthlyList: {
    gap: 8,
  },
  monthlyItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  monthlyIcon: {
    marginRight: 10,
  },
  monthlyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  monthlyCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  monthlyRight: {
    alignItems: 'flex-end',
  },
  monthlyTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  monthlyAvg: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  overBudgetText: {
    color: '#DC3545',
  },
});
