import { useEffect, useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense } from '@/types/database';
import { getAllExpenses } from '@/lib/db/models/expenses';
import { getDatabase } from '@/lib/db/core/database';
import CalendarPicker from '@/components/shared/CalendarPicker';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface InsightsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  total: number;
  count: number;
  average: number;
  percentage: number;
}

interface DayOfWeekSpending {
  day: string;
  total: number;
  average: number;
}

export default function InsightsModal({ visible, onClose }: InsightsModalProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'3months' | 'all' | 'custom'>('3months');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (visible) {
      loadExpenses();
    }
  }, [visible]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const allExpenses = await getAllExpenses(db);
      setExpenses(allExpenses);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter expenses by timeframe
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (timeframe === '3months') {
      const threeMonthsAgo = new Date(startOfToday);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return expenses.filter(e => e.date >= threeMonthsAgo);
    } else if (timeframe === 'custom') {
      const startOfCustomStart = new Date(
        customStartDate.getFullYear(),
        customStartDate.getMonth(),
        customStartDate.getDate()
      );
      const endOfCustomEnd = new Date(
        customEndDate.getFullYear(),
        customEndDate.getMonth(),
        customEndDate.getDate(),
        23, 59, 59
      );
      return expenses.filter(e => e.date >= startOfCustomStart && e.date <= endOfCustomEnd);
    }
    return expenses;
  }, [expenses, timeframe, customStartDate, customEndDate]);

  // Calculate total spending
  const totalSpending = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  }, [filteredExpenses]);

  // Calculate spending by category
  const categorySpending = useMemo((): CategorySpending[] => {
    const categoryMap = new Map<string, CategorySpending>();

    filteredExpenses.forEach((expense) => {
      const catId = expense.category.id;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          categoryId: catId,
          categoryName: expense.category.name,
          categoryColor: expense.category.color,
          categoryIcon: expense.category.icon,
          total: 0,
          count: 0,
          average: 0,
          percentage: 0,
        });
      }

      const cat = categoryMap.get(catId)!;
      cat.total += parseFloat(expense.amount);
      cat.count += 1;
    });

    // Calculate averages and percentages
    const categories = Array.from(categoryMap.values());
    categories.forEach((cat) => {
      cat.average = cat.total / cat.count;
      cat.percentage = totalSpending > 0 ? (cat.total / totalSpending) * 100 : 0;
    });

    // Sort by total spending (highest first)
    return categories.sort((a, b) => b.total - a.total);
  }, [filteredExpenses, totalSpending]);

  // Calculate day of week spending
  const dayOfWeekSpending = useMemo((): DayOfWeekSpending[] => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap = new Map<number, { total: number; count: number }>();

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      dayMap.set(i, { total: 0, count: 0 });
    }

    filteredExpenses.forEach((expense) => {
      const dayOfWeek = expense.date.getDay();
      const day = dayMap.get(dayOfWeek)!;
      day.total += parseFloat(expense.amount);
      day.count += 1;
    });

    const result: DayOfWeekSpending[] = [];
    dayMap.forEach((data, dayNum) => {
      result.push({
        day: dayNames[dayNum],
        total: data.total,
        average: data.count > 0 ? data.total / data.count : 0,
      });
    });

    return result;
  }, [filteredExpenses]);

  // Find highest spending day
  const highestSpendingDay = useMemo(() => {
    return dayOfWeekSpending.reduce((prev, current) =>
      current.total > prev.total ? current : prev
    , dayOfWeekSpending[0]);
  }, [dayOfWeekSpending]);

  // Calculate insights
  const insights = useMemo(() => {
    const results: { icon: string; color: string; title: string; description: string }[] = [];

    // Top spending category
    if (categorySpending.length > 0) {
      const topCategory = categorySpending[0];
      results.push({
        icon: 'trending-up',
        color: '#DC3545',
        title: 'Top Spending Category',
        description: `${topCategory.categoryName} accounts for ${topCategory.percentage.toFixed(1)}% of your spending (${formatCurrency(topCategory.total)}).`,
      });
    }

    // Weekend vs weekday spending
    const weekendDays = dayOfWeekSpending.filter(d => d.day === 'Saturday' || d.day === 'Sunday');
    const weekdayDays = dayOfWeekSpending.filter(d => d.day !== 'Saturday' && d.day !== 'Sunday');
    const weekendTotal = weekendDays.reduce((sum, d) => sum + d.total, 0);
    const weekdayTotal = weekdayDays.reduce((sum, d) => sum + d.total, 0);

    if (weekendTotal > weekdayTotal * 0.4) {
      results.push({
        icon: 'calendar',
        color: '#FF9800',
        title: 'Weekend Spending Pattern',
        description: `You spend significantly more on weekends (${formatCurrency(weekendTotal)}). Consider planning weekend activities in advance.`,
      });
    }

    // High spending day alert
    if (highestSpendingDay && highestSpendingDay.total > totalSpending * 0.3) {
      results.push({
        icon: 'alert-circle',
        color: '#DC3545',
        title: `${highestSpendingDay.day} Spending Alert`,
        description: `${highestSpendingDay.day} is your highest spending day with ${formatCurrency(highestSpendingDay.total)} spent.`,
      });
    }

    // Frequent small purchases
    const smallPurchases = filteredExpenses.filter(e => parseFloat(e.amount) < 20);
    if (smallPurchases.length > filteredExpenses.length * 0.5) {
      const smallTotal = smallPurchases.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      results.push({
        icon: 'receipt',
        color: '#FF9800',
        title: 'Frequent Small Purchases',
        description: `${smallPurchases.length} purchases under $20 add up to ${formatCurrency(smallTotal)}. These can impact your budget significantly.`,
      });
    }

    // Average daily spending
    let daysInTimeframe = 1;
    if (timeframe === '3months') {
      daysInTimeframe = 90;
    } else if (timeframe === 'custom') {
      const diffTime = Math.abs(customEndDate.getTime() - customStartDate.getTime());
      daysInTimeframe = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } else {
      // All time - use actual days from first to last expense
      if (filteredExpenses.length > 0) {
        const dates = filteredExpenses.map(e => e.date.getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const diffTime = Math.abs(maxDate - minDate);
        daysInTimeframe = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    }
    const avgDailySpending = totalSpending / daysInTimeframe;
    results.push({
      icon: 'calculator',
      color: '#355e3b',
      title: 'Average Daily Spending',
      description: `You're spending an average of ${formatCurrency(avgDailySpending)} per day in the selected timeframe.`,
    });

    return results;
  }, [categorySpending, dayOfWeekSpending, highestSpendingDay, filteredExpenses, totalSpending, timeframe]);

  // Suggested category budgets based on spending patterns
  const suggestedBudgets = useMemo(() => {
    if (timeframe !== '3months' || categorySpending.length === 0) return [];

    return categorySpending.slice(0, 5).map((cat) => {
      // For 3 months, calculate monthly average and suggest with 10% buffer
      const monthlyAverage = cat.total / 3;
      const suggested = Math.ceil(monthlyAverage * 1.1);
      return {
        ...cat,
        monthlyAverage,
        suggestedBudget: suggested,
      };
    });
  }, [categorySpending, timeframe]);

  // Handle custom date selection
  const handleCustomDateSelect = () => {
    if (customStartDate > customEndDate) {
      Alert.alert('Invalid Date Range', 'Start date must be before end date.');
      return;
    }
    setTimeframe('custom');
  };

  const handleDatePickerConfirm = (date: Date) => {
    if (datePickerMode === 'start') {
      setCustomStartDate(date);
    } else {
      setCustomEndDate(date);
    }
    setShowDatePicker(false);
  };

  const openDatePicker = (mode: 'start' | 'end') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const formatDateRange = () => {
    const start = customStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = customEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Insights</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          <TouchableOpacity
            style={[styles.timeframeButton, timeframe === '3months' && styles.timeframeButtonActive]}
            onPress={() => setTimeframe('3months')}
          >
            <Text style={[styles.timeframeText, timeframe === '3months' && styles.timeframeTextActive]}>
              3 Months
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeframeButton, timeframe === 'all' && styles.timeframeButtonActive]}
            onPress={() => setTimeframe('all')}
          >
            <Text style={[styles.timeframeText, timeframe === 'all' && styles.timeframeTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeframeButton, timeframe === 'custom' && styles.timeframeButtonActive]}
            onPress={handleCustomDateSelect}
          >
            <Text style={[styles.timeframeText, timeframe === 'custom' && styles.timeframeTextActive]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Date Range Selector */}
        {timeframe === 'custom' && (
          <View style={styles.customDateContainer}>
            <TouchableOpacity
              style={styles.dateSelectButton}
              onPress={() => openDatePicker('start')}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <View style={styles.dateSelectText}>
                <Text style={styles.dateLabel}>Start Date</Text>
                <Text style={styles.dateValue}>
                  {customStartDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={20} color="#999" />
            <TouchableOpacity
              style={styles.dateSelectButton}
              onPress={() => openDatePicker('end')}
            >
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <View style={styles.dateSelectText}>
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={styles.dateValue}>
                  {customEndDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Total Spending Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Spending</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalSpending)}</Text>
            <Text style={styles.summarySubtext}>
              {filteredExpenses.length} transactions
            </Text>
          </View>

          {/* Insights Section */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Insights & Recommendations</Text>
              {insights.map((insight, index) => (
                <View key={index} style={styles.insightCard}>
                  <View style={[styles.insightIcon, { backgroundColor: insight.color + '20' }]}>
                    <Ionicons name={insight.icon as any} size={24} color={insight.color} />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightDescription}>{insight.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Category Breakdown */}
          {categorySpending.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spending by Category</Text>
              {categorySpending.map((cat) => (
                <View key={cat.categoryId} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <View style={[styles.categoryIconContainer, { backgroundColor: cat.categoryColor + '20' }]}>
                        <Ionicons name={cat.categoryIcon as any} size={20} color={cat.categoryColor} />
                      </View>
                      <View>
                        <Text style={styles.categoryName}>{cat.categoryName}</Text>
                        <Text style={styles.categoryCount}>{cat.count} transactions</Text>
                      </View>
                    </View>
                    <View style={styles.categoryAmounts}>
                      <Text style={styles.categoryTotal}>{formatCurrency(cat.total)}</Text>
                      <Text style={styles.categoryPercentage}>{cat.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${cat.percentage}%`, backgroundColor: cat.categoryColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.categoryAverage}>
                    Avg: {formatCurrency(cat.average)} per transaction
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Suggested Budgets */}
          {suggestedBudgets.length > 0 && timeframe === '3months' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Suggested Monthly Budgets</Text>
              <Text style={styles.sectionSubtitle}>
                Based on your 3-month average with a 10% buffer
              </Text>
              {suggestedBudgets.map((cat) => (
                <View key={cat.categoryId} style={styles.budgetSuggestionCard}>
                  <View style={styles.budgetHeader}>
                    <View style={[styles.categoryIconContainer, { backgroundColor: cat.categoryColor + '20' }]}>
                      <Ionicons name={cat.categoryIcon as any} size={20} color={cat.categoryColor} />
                    </View>
                    <Text style={styles.budgetCategoryName}>{cat.categoryName}</Text>
                  </View>
                  <View style={styles.budgetAmounts}>
                    <View>
                      <Text style={styles.budgetLabel}>Monthly Average</Text>
                      <Text style={styles.budgetAmount}>{formatCurrency(cat.monthlyAverage)}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={20} color="#999" />
                    <View>
                      <Text style={styles.budgetLabel}>Suggested Budget</Text>
                      <Text style={[styles.budgetAmount, styles.suggestedAmount]}>
                        {formatCurrency(cat.suggestedBudget)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Day of Week Analysis */}
          {dayOfWeekSpending.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spending by Day of Week</Text>
              {dayOfWeekSpending.map((day) => {
                const maxTotal = Math.max(...dayOfWeekSpending.map(d => d.total));
                const barWidth = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;

                return (
                  <View key={day.day} style={styles.dayCard}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayName}>{day.day}</Text>
                      <Text style={styles.dayTotal}>{formatCurrency(day.total)}</Text>
                    </View>
                    <View style={styles.dayBarContainer}>
                      <View
                        style={[
                          styles.dayBar,
                          {
                            width: `${barWidth}%`,
                            backgroundColor: day.day === highestSpendingDay?.day ? '#DC3545' : '#355e3b',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {filteredExpenses.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No expenses found</Text>
              <Text style={styles.emptyStateSubtext}>
                Add some expenses to see analytics and insights
              </Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Calendar Picker for Custom Date Range */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.calendarModalOverlay}>
            <View style={styles.calendarModalContent}>
              <View style={styles.calendarHeaderCustom}>
                <Text style={styles.calendarTitleCustom}>
                  Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
                </Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarPickerWrapper}>
                <CalendarPicker
                  currentDate={datePickerMode === 'start' ? customStartDate : customEndDate}
                  onConfirm={handleDatePickerConfirm}
                  onCancel={() => setShowDatePicker(false)}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timeframeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#355e3b',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeframeTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#355e3b',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  categoryCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#666',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  categoryAverage: {
    fontSize: 12,
    color: '#666',
  },
  budgetSuggestionCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  budgetCategoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  budgetAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  suggestedAmount: {
    color: '#355e3b',
  },
  dayCard: {
    marginTop: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dayTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dayBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayBar: {
    height: '100%',
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  customDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  dateSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateSelectText: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  calendarHeaderCustom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  calendarTitleCustom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  calendarPickerWrapper: {
    height: 480,
  },
});
