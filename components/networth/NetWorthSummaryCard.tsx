import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NetWorthEntryCompat } from '@/hooks/useNetWorth';
import {
  calculateNetWorth,
  calculateLiquidNetWorth,
  calculateIlliquidNetWorth,
  calculateRetirementNetWorth,
  calculateTotalLiabilities,
  formatDate,
  parseDate,
} from '@/lib/db/models/net-worth';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface NetWorthSummaryCardProps {
  entry: NetWorthEntryCompat;
}

export default function NetWorthSummaryCard({ entry }: NetWorthSummaryCardProps) {
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
        {formatCurrency(calculateNetWorth(entry))}
      </Text>
      <View style={styles.summaryBreakdown}>
        <View style={styles.summaryCategory}>
          <View style={[styles.categoryIndicator, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.summaryCategoryTitle}>Liquid</Text>
          <Text style={[
            styles.summaryCompactValue,
            calculateLiquidNetWorth(entry) >= 0 ? styles.positiveValue : styles.negativeValue
          ]}>
            {formatCurrency(Math.abs(calculateLiquidNetWorth(entry)))}
          </Text>
        </View>

        <View style={styles.summaryCategory}>
          <View style={[styles.categoryIndicator, { backgroundColor: '#EAB308' }]} />
          <Text style={styles.summaryCategoryTitle}>Illiquid</Text>
          <Text style={[
            styles.summaryCompactValue,
            calculateIlliquidNetWorth(entry) >= 0 ? styles.positiveValue : styles.negativeValue
          ]}>
            {formatCurrency(Math.abs(calculateIlliquidNetWorth(entry)))}
          </Text>
        </View>

        <View style={styles.summaryCategory}>
          <View style={[styles.categoryIndicator, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.summaryCategoryTitle}>Retirement</Text>
          <Text style={[
            styles.summaryCompactValue,
            calculateRetirementNetWorth(entry) >= 0 ? styles.positiveValue : styles.negativeValue
          ]}>
            {formatCurrency(Math.abs(calculateRetirementNetWorth(entry)))}
          </Text>
        </View>

        <View style={styles.summaryCategory}>
          <View style={[styles.categoryIndicator, { backgroundColor: '#DC3545' }]} />
          <Text style={styles.summaryCategoryTitle}>Liabilities</Text>
          <Text style={[styles.summaryCompactValue, styles.negativeValue]}>
            {formatCurrency(calculateTotalLiabilities(entry))}
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
    marginBottom: 16,
  },
  summaryBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  summaryCategory: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  summaryCategoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  summaryCompactValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  categoryIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  positiveValue: {
    color: '#4CAF50',
  },
  negativeValue: {
    color: '#DC3545',
  },
});
