import { StyleSheet, Text, TouchableOpacity, View, Switch, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RecurringExpense } from '@/types/database';
import { formatCurrency } from '@/lib/utils/number-formatter';
import { getNextOccurrenceDate } from '@/lib/services/recurring-expense-generator';

interface RecurringExpenseListProps {
  recurringExpenses: RecurringExpense[];
  onEdit: (expense: RecurringExpense) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export default function RecurringExpenseList({
  recurringExpenses,
  onEdit,
  onDelete,
  onToggleActive,
}: RecurringExpenseListProps) {
  const getFrequencyLabel = (frequency: string): string => {
    const labels: { [key: string]: string } = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return labels[frequency] || frequency;
  };

  const formatNextOccurrence = (recurring: RecurringExpense): string => {
    const nextDate = getNextOccurrenceDate(recurring);
    if (!nextDate) return 'No more occurrences';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `in ${diffDays} days`;

    return nextDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: nextDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    id: string
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
          onPress={() => onDelete(id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={24} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (recurringExpenses.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="repeat-outline" size={48} color="#CCC" />
        <Text style={styles.emptyStateText}>No recurring expenses</Text>
        <Text style={styles.emptyStateSubtext}>
          Tap + to create a recurring expense
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {recurringExpenses.map((recurring, index) => (
        <Swipeable
          key={recurring.id}
          renderRightActions={(progress, dragX) =>
            renderRightActions(progress, dragX, recurring.id)
          }
          overshootRight={false}
        >
          <TouchableOpacity
            style={[
              styles.recurringItem,
              index === 0 && styles.recurringItemFirst,
              index === recurringExpenses.length - 1 && styles.recurringItemLast,
              index !== 0 && styles.recurringItemNotFirst,
              !recurring.isActive && styles.recurringItemInactive,
            ]}
            onPress={() => onEdit(recurring)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: recurring.category.color + '20' },
              ]}
            >
              <Ionicons
                name={recurring.category.icon}
                size={20}
                color={recurring.category.color}
              />
            </View>

            <View style={styles.recurringDetails}>
              <View style={styles.topRow}>
                <Text style={styles.categoryText}>{recurring.category.name}</Text>
                <Text style={styles.amountText}>
                  {formatCurrency(recurring.amount)}
                </Text>
              </View>

              <View style={styles.bottomRow}>
                <View style={styles.frequencyBadge}>
                  <Ionicons name="repeat-outline" size={12} color="#355e3b" />
                  <Text style={styles.frequencyText}>
                    {getFrequencyLabel(recurring.frequency)}
                  </Text>
                </View>
                <Text style={styles.nextOccurrenceText}>
                  Next: {formatNextOccurrence(recurring)}
                </Text>
              </View>

              {recurring.note ? (
                <Text style={styles.noteText} numberOfLines={1}>
                  {recurring.note}
                </Text>
              ) : null}
            </View>

            <Switch
              value={recurring.isActive}
              onValueChange={(value) => onToggleActive(recurring.id, value)}
              trackColor={{ false: '#D1D1D6', true: '#355e3b' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D1D6"
            />
          </TouchableOpacity>
        </Swipeable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  recurringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  recurringItemFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  recurringItemLast: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  recurringItemNotFirst: {
    borderTopWidth: 0,
  },
  recurringItemInactive: {
    opacity: 0.5,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recurringDetails: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#355e3b',
  },
  nextOccurrenceText: {
    fontSize: 12,
    color: '#666',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 4,
  },
});
