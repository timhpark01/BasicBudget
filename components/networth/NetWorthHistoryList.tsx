import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { NetWorthEntryCompat } from '@/hooks/useNetWorth';
import {
  calculateNetWorth,
  calculateTotalAssets,
  calculateTotalLiabilities,
  parseDate,
} from '@/lib/db/models/net-worth';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface NetWorthHistoryListProps {
  entries: NetWorthEntryCompat[];
  onEntryTap: (entry: NetWorthEntryCompat) => void;
  onEntryLongPress: (entry: NetWorthEntryCompat) => void;
  onSwipeDelete: (entry: NetWorthEntryCompat) => void;
}

export default function NetWorthHistoryList({
  entries,
  onEntryTap,
  onEntryLongPress,
  onSwipeDelete,
}: NetWorthHistoryListProps) {
  if (entries.length === 0) {
    return null;
  }

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    entry: NetWorthEntryCompat
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
          onPress={() => onSwipeDelete(entry)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={24} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.historySection}>
      <Text style={styles.historyTitle}>History</Text>
      {entries.slice(0, 6).map((entry) => (
        <Swipeable
          key={entry.id}
          renderRightActions={(progress, dragX) =>
            renderRightActions(progress, dragX, entry)
          }
          overshootRight={false}
        >
          <TouchableOpacity
            style={styles.historyItem}
            onPress={() => onEntryTap(entry)}
            onLongPress={() => onEntryLongPress(entry)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.historyMonth}>
                {parseDate(entry.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <View style={styles.historyBreakdown}>
                <Text style={styles.historyDetail}>
                  Assets: {formatCurrency(calculateTotalAssets(entry))}
                </Text>
                <Text style={styles.historyDetail}>
                  Liabilities: {formatCurrency(calculateTotalLiabilities(entry))}
                </Text>
              </View>
            </View>
            <Text style={styles.historyValue}>
              {formatCurrency(calculateNetWorth(entry))}
            </Text>
          </TouchableOpacity>
        </Swipeable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  historySection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyBreakdown: {
    flexDirection: 'row',
    gap: 16,
  },
  historyDetail: {
    fontSize: 12,
    color: '#666',
  },
  historyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#355e3b',
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
