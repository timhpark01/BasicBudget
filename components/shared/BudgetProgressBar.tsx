import { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense, CategoryBudget } from '@/types/database';
import CategoryBudgetModal from '@/components/modals/budget/CategoryBudgetModal';
import CategoryAnalyticsModal from '@/components/modals/analytics/CategoryAnalyticsModal';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface BudgetProgressBarProps {
  totalExpenses: number;
  budgetAmount: number;
  expenses?: Expense[];
  month?: string;
  categoryBudgets?: CategoryBudget[];
  onSetCategoryBudget?: (categoryId: string, budgetAmount: string) => Promise<void>;
  onDeleteCategoryBudget?: (categoryId: string) => Promise<void>;
  allCategoryBudgets?: any[];
  onSetCategoryBudgetForMonth?: (month: string, categoryId: string, budgetAmount: string) => Promise<void>;
  onDeleteCategoryBudgetForMonth?: (month: string, categoryId: string) => Promise<void>;
}

export default function BudgetProgressBar({
  totalExpenses,
  budgetAmount,
  expenses = [],
  month,
  categoryBudgets = [],
  onSetCategoryBudget,
  onDeleteCategoryBudget,
  allCategoryBudgets = [],
  onSetCategoryBudgetForMonth,
  onDeleteCategoryBudgetForMonth,
}: BudgetProgressBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null>(null);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);

  // Calculate percentage with proportional scaling when over budget
  const isOverBudget = totalExpenses > budgetAmount;

  // When over budget, scale proportionally to fit in 100%
  const budgetSegmentPercentage = isOverBudget
    ? (budgetAmount / totalExpenses) * 100
    : Math.min((totalExpenses / budgetAmount) * 100, 100);

  const overageSegmentPercentage = isOverBudget
    ? ((totalExpenses - budgetAmount) / totalExpenses) * 100
    : 0;

  // Determine bar colors
  const budgetBarColor = '#355e3b'; // Green for budget portion when under budget
  const overBudgetBarColor = '#DC3545'; // Red for budget portion when over budget
  const overageBarColor = '#8B0000'; // Dark maroon for overage portion

  // Calculate days in month and days elapsed
  const daysInMonth = useMemo(() => {
    if (!month) return 30;
    const [year, monthNum] = month.split('-');
    return new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  }, [month]);

  const daysElapsed = useMemo(() => {
    if (!month) return 1;
    const [year, monthNum] = month.split('-');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (month === currentMonth) {
      return now.getDate();
    } else if (month < currentMonth) {
      // Past month - use full month
      return daysInMonth;
    } else {
      // Future month - use 1 day to avoid division by zero
      return 1;
    }
  }, [month, daysInMonth]);

  // Calculate daily averages
  const avgSpendingPerDay = totalExpenses / daysElapsed;
  const idealSpendingPerDay = budgetAmount / daysInMonth;

  // Calculate days remaining and avg per remaining day
  const daysRemaining = useMemo(() => {
    if (!month) return 0;
    const [year, monthNum] = month.split('-');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (month === currentMonth) {
      return daysInMonth - now.getDate();
    } else if (month < currentMonth) {
      // Past month - no days remaining
      return 0;
    } else {
      // Future month - full month remaining
      return daysInMonth;
    }
  }, [month, daysInMonth]);

  const remainingBudget = Math.max(0, budgetAmount - totalExpenses);
  const avgPerRemainingDay = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

  // Group expenses by category
  const categoryTotals = useMemo(() => {
    const totals: { [key: string]: { id: string; name: string; amount: number; color: string; icon: string } } = {};

    expenses.forEach((expense) => {
      const categoryId = expense.category.id;
      if (!totals[categoryId]) {
        totals[categoryId] = {
          id: categoryId,
          name: expense.category.name,
          amount: 0,
          color: expense.category.color,
          icon: expense.category.icon,
        };
      }
      totals[categoryId].amount += parseFloat(expense.amount);
    });

    // Sort by amount (highest first)
    return Object.values(totals).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  // Helper to get category budget
  const getCategoryBudget = (categoryId: string): number | null => {
    const budget = categoryBudgets.find((b) => b.categoryId === categoryId);
    return budget ? parseFloat(budget.budgetAmount) : null;
  };

  // Handle category press to view analytics
  const handleCategoryPress = (category: { id: string; name: string; icon: string; color: string }) => {
    setSelectedCategory(category);
    setAnalyticsModalVisible(true);
  };

  const handleSaveCategoryBudget = async (budgetAmount: string) => {
    if (!selectedCategory || !onSetCategoryBudget) return;
    await onSetCategoryBudget(selectedCategory.id, budgetAmount);
  };

  const handleDeleteCategoryBudget = async () => {
    if (!selectedCategory || !onDeleteCategoryBudget) return;
    await onDeleteCategoryBudget(selectedCategory.id);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
        style={styles.headerContainer}
      >
        {/* Budget header */}
        <View style={styles.header}>
          <Text style={styles.label}>Remaining Spending</Text>
          <View style={styles.headerRight}>
            <Text style={[styles.amount, isOverBudget && styles.amountOver]}>
              {formatCurrency(Math.max(0, budgetAmount - totalExpenses))} of {formatCurrency(budgetAmount)}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
              style={styles.chevron}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Progress bar background */}
      <View style={styles.progressBarBackground}>
        {isOverBudget ? (
          // Over budget: Two segments side-by-side (red + darker red)
          <>
            {/* Budget portion (scaled down, red) */}
            <View
              style={[
                styles.progressBarSegment,
                {
                  width: `${budgetSegmentPercentage}%`,
                  backgroundColor: overBudgetBarColor,
                  borderRightWidth: 2,
                  borderRightColor: '#fff',
                },
              ]}
            />
            {/* Overage portion (scaled down, darker red) */}
            <View
              style={[
                styles.progressBarSegment,
                {
                  width: `${overageSegmentPercentage}%`,
                  backgroundColor: overageBarColor,
                },
              ]}
            />
          </>
        ) : (
          // Under budget: Single segment (green)
          <View
            style={[
              styles.progressBarSegment,
              {
                width: `${budgetSegmentPercentage}%`,
                backgroundColor: budgetBarColor,
              },
            ]}
          />
        )}
      </View>

      {/* Status message */}
      {isOverBudget && (
        <Text style={styles.overBudgetText}>
          {formatCurrency(totalExpenses - budgetAmount)} over budget
        </Text>
      )}

      {/* Expanded details section */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          {/* Daily spending comparison */}
          <View style={styles.dailySpendingSection}>
            <Text style={styles.sectionTitle}>Daily Spending</Text>
            <View style={styles.dailySpendingRow}>
              <View style={styles.dailySpendingItem}>
                <Text style={styles.dailySpendingLabel}>Avg per day</Text>
                <Text style={[
                  styles.dailySpendingValue,
                  avgSpendingPerDay > idealSpendingPerDay && styles.dailySpendingOverBudget
                ]}>
                  {formatCurrency(avgSpendingPerDay)}
                </Text>
              </View>
              <View style={styles.dailySpendingDivider} />
              <View style={styles.dailySpendingItem}>
                <Text style={styles.dailySpendingLabel}>Ideal per day</Text>
                <Text style={styles.dailySpendingValue}>
                  {formatCurrency(idealSpendingPerDay)}
                </Text>
              </View>
              <View style={styles.dailySpendingDivider} />
              <View style={styles.dailySpendingItem}>
                <Text style={styles.dailySpendingLabel}>
                  {daysRemaining > 0 ? 'Remaining per day' : 'Month ended'}
                </Text>
                <Text style={[
                  styles.dailySpendingValue,
                  daysRemaining === 0 && styles.dailySpendingMuted
                ]}>
                  {daysRemaining > 0 ? formatCurrency(avgPerRemainingDay) : '-'}
                </Text>
              </View>
            </View>
          </View>

          {/* Category breakdown */}
          {categoryTotals.length > 0 && (
            <View style={styles.categoriesSection}>
              <View style={styles.categoriesHeader}>
                <Text style={styles.sectionTitle}>Categories</Text>
                <Text style={styles.categoryHint}>Tap for analytics</Text>
              </View>
              {categoryTotals.map((category, index) => {
                const categoryBudget = getCategoryBudget(category.id);
                // Only check over-budget status if category has its own budget
                const isOverCategoryBudget = categoryBudget !== null && category.amount > categoryBudget;

                // Proportional scaling for category progress bar
                // If no category budget, use monthly budget for percentage calculation only
                const categoryBudgetAmount = categoryBudget || budgetAmount;
                const categorySegmentPercentage = isOverCategoryBudget
                  ? (categoryBudget / category.amount) * 100
                  : Math.min((category.amount / categoryBudgetAmount) * 100, 100);

                const categoryOveragePercentage = isOverCategoryBudget
                  ? ((category.amount - categoryBudget) / category.amount) * 100
                  : 0;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryItem}
                    onPress={() => handleCategoryPress(category)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLeft}>
                        <View
                          style={[
                            styles.categoryIconSmall,
                            { backgroundColor: category.color + '20' },
                          ]}
                        >
                          <Ionicons
                            name={category.icon as any}
                            size={16}
                            color={category.color}
                          />
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryName}>{category.name}</Text>
                          {categoryBudget && (
                            <Text style={styles.categoryBudgetText}>
                              {formatCurrency(category.amount)} of {formatCurrency(categoryBudget)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.categoryRight}>
                        {!categoryBudget && (
                          <Text style={styles.categoryAmount}>
                            {formatCurrency(category.amount)}
                          </Text>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#999"
                          style={styles.categoryChevron}
                        />
                      </View>
                    </View>
                    <View style={styles.categoryProgressBarBackground}>
                      {isOverCategoryBudget ? (
                        // Over budget: Two red segments
                        <>
                          <View
                            style={[
                              styles.categoryProgressBarSegment,
                              {
                                width: `${categorySegmentPercentage}%`,
                                backgroundColor: overBudgetBarColor,
                                borderRightWidth: 2,
                                borderRightColor: '#fff',
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.categoryProgressBarSegment,
                              {
                                width: `${categoryOveragePercentage}%`,
                                backgroundColor: overageBarColor,
                              },
                            ]}
                          />
                        </>
                      ) : (
                        // Under budget: Category color
                        <View
                          style={[
                            styles.categoryProgressBarSegment,
                            {
                              width: `${categorySegmentPercentage}%`,
                              backgroundColor: category.color,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Category Budget Modal */}
      {selectedCategory && (
        <CategoryBudgetModal
          visible={budgetModalVisible}
          onClose={() => setBudgetModalVisible(false)}
          categoryName={selectedCategory.name}
          categoryIcon={selectedCategory.icon}
          categoryColor={selectedCategory.color}
          currentBudget={getCategoryBudget(selectedCategory.id)?.toString()}
          onSave={handleSaveCategoryBudget}
          onDelete={onDeleteCategoryBudget ? handleDeleteCategoryBudget : undefined}
        />
      )}

      {/* Category Analytics Modal */}
      {selectedCategory && (
        <CategoryAnalyticsModal
          visible={analyticsModalVisible}
          onClose={() => setAnalyticsModalVisible(false)}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          categoryIcon={selectedCategory.icon}
          categoryColor={selectedCategory.color}
          categoryBudgets={allCategoryBudgets}
          onSetCategoryBudget={onSetCategoryBudgetForMonth}
          onDeleteCategoryBudget={onDeleteCategoryBudgetForMonth}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerContainer: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  amountOver: {
    color: '#DC3545',
  },
  chevron: {
    marginLeft: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressBarSegment: {
    height: '100%',
  },
  overBudgetText: {
    fontSize: 12,
    color: '#DC3545',
    marginTop: 6,
    fontWeight: '600',
  },
  expandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  dailySpendingSection: {
    marginBottom: 20,
  },
  dailySpendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  dailySpendingItem: {
    flex: 1,
    alignItems: 'center',
  },
  dailySpendingDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  dailySpendingLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dailySpendingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#355e3b',
  },
  dailySpendingOverBudget: {
    color: '#DC3545',
  },
  dailySpendingMuted: {
    color: '#999',
  },
  categoriesSection: {
    marginTop: 8,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryHint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  categoryBudgetText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  categoryChevron: {
    marginLeft: 4,
  },
  categoryProgressBarBackground: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  categoryProgressBarSegment: {
    height: '100%',
  },
});
