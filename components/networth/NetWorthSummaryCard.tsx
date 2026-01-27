import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetWorthEntryCompat } from '@/hooks/useNetWorth';
import {
  calculateNetWorth,
  calculateLiquidAssets,
  calculateIlliquidAssets,
  calculateRetirementAssets,
  calculateTotalLiabilities,
  formatDate,
  parseDate,
} from '@/lib/db/models/net-worth';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils/number-formatter';

interface NetWorthSummaryCardProps {
  entry: NetWorthEntryCompat;
  previousEntry?: NetWorthEntryCompat;
}

export default function NetWorthSummaryCard({ entry, previousEntry }: NetWorthSummaryCardProps) {
  const currentNetWorth = calculateNetWorth(entry);
  const previousNetWorth = previousEntry ? calculateNetWorth(previousEntry) : null;
  const change = previousNetWorth !== null ? currentNetWorth - previousNetWorth : null;
  const changePercent = previousNetWorth !== null && previousNetWorth !== 0
    ? (change! / Math.abs(previousNetWorth)) * 100
    : null;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>
        {entry.date === formatDate(new Date())
          ? 'Current Net Worth'
          : `Net Worth as of ${parseDate(entry.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}`
        }
      </Text>
      <Text style={styles.summaryAmount}>
        {formatCurrency(currentNetWorth)}
      </Text>
      {change !== null && (
        <View style={styles.changeRow}>
          <Ionicons
            name={change >= 0 ? 'arrow-up' : 'arrow-down'}
            size={14}
            color={change >= 0 ? '#4CAF50' : '#DC3545'}
          />
          <Text style={[styles.changeAmount, change >= 0 ? styles.changePositive : styles.changeNegative]}>
            {change >= 0 ? '+' : ''}{formatCurrency(change)}
            {changePercent !== null && ` (${change >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)`}
          </Text>
          <Text style={styles.changeSince}>
            since {parseDate(previousEntry!.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      )}
      <View style={styles.summaryBreakdown}>
        <View style={styles.summaryCategory}>
          <Text style={styles.summaryCategoryTitle}>Liquid</Text>
          <Text style={styles.summaryCompactValue}>
            {formatCompactCurrency(calculateLiquidAssets(entry))}
          </Text>
        </View>

        <View style={styles.summaryCategory}>
          <Text style={styles.summaryCategoryTitle}>Illiquid</Text>
          <Text style={styles.summaryCompactValue}>
            {formatCompactCurrency(calculateIlliquidAssets(entry))}
          </Text>
        </View>

        <View style={styles.summaryCategory}>
          <Text style={styles.summaryCategoryTitle}>Retire</Text>
          <Text style={styles.summaryCompactValue}>
            {formatCompactCurrency(calculateRetirementAssets(entry))}
          </Text>
        </View>

        <View style={styles.summaryCategory}>
          <Text style={styles.summaryCategoryTitle}>Debts</Text>
          <Text style={styles.summaryCompactValue}>
            {formatCompactCurrency(calculateTotalLiabilities(entry))}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#355e3b',
    margin: 16,
    padding: 24,
    borderRadius: 16,
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
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  changeAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  changePositive: {
    color: '#4CAF50',
  },
  changeNegative: {
    color: '#DC3545',
  },
  changeSince: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.6,
  },
  summaryBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  summaryCategory: {
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  summaryCategoryTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  summaryCompactValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  negativeValue: {
    color: '#DC3545',
  },
});
