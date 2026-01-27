import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Line as SvgLine, Text as SvgText, Circle } from 'react-native-svg';
import { NetWorthEntryCompat } from '@/hooks/useNetWorth';
import {
  calculateIlliquidAssets,
  calculateLiquidAssets,
  calculateRetirementAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  formatDate,
  parseDate,
} from '@/lib/db/models/net-worth';
import { formatNumberWithCommas, formatCurrency, formatCompactCurrency } from '@/lib/utils/number-formatter';

interface NetWorthChartProps {
  entries: NetWorthEntryCompat[];
  latestEntry?: NetWorthEntryCompat | null;
  previousEntry?: NetWorthEntryCompat | null;
}

export default function NetWorthChart({ entries, latestEntry, previousEntry }: NetWorthChartProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="trending-up-outline" size={64} color="#ccc" />
        <Text style={styles.emptyStateText}>No data yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Switch to Entry view to add your first net worth entry
        </Text>
      </View>
    );
  }

  // Summary calculations
  const currentNetWorth = latestEntry ? calculateNetWorth(latestEntry) : null;
  const previousNetWorth = previousEntry ? calculateNetWorth(previousEntry) : null;
  const change = currentNetWorth !== null && previousNetWorth !== null
    ? currentNetWorth - previousNetWorth
    : null;
  const changePercent = change !== null && previousNetWorth !== null && previousNetWorth !== 0
    ? (change / Math.abs(previousNetWorth)) * 100
    : null;

  // Date label for header
  const dateLabel = latestEntry
    ? latestEntry.date === formatDate(new Date())
      ? 'Today'
      : parseDate(latestEntry.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
    : '';

  // Category values from latest entry
  const liquidValue = latestEntry ? calculateLiquidAssets(latestEntry) : 0;
  const illiquidValue = latestEntry ? calculateIlliquidAssets(latestEntry) : 0;
  const retirementValue = latestEntry ? calculateRetirementAssets(latestEntry) : 0;
  const debtsValue = latestEntry ? calculateTotalLiabilities(latestEntry) : 0;

  const width = Dimensions.get('window').width - 64;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const sortedEntries = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);

  // Calculate GROSS assets per category (not net)
  const illiquidData = sortedEntries.map(e => calculateIlliquidAssets(e));
  const liquidData = sortedEntries.map(e => calculateLiquidAssets(e));
  const retirementData = sortedEntries.map(e => calculateRetirementAssets(e));
  const netWorthData = sortedEntries.map(e => calculateNetWorth(e));

  // Cumulative stacking for gross assets
  const cumIlliquid = illiquidData;
  const cumLiquid = illiquidData.map((v, i) => v + liquidData[i]);
  const cumRetirement = cumLiquid.map((v, i) => v + retirementData[i]);

  // Find max/min values for scaling (account for negative net worth)
  const maxValue = Math.max(...cumRetirement, ...netWorthData);
  const minValue = Math.min(0, ...netWorthData);

  // Scale functions
  const xScale = (index: number) => (index / Math.max(sortedEntries.length - 1, 1)) * chartWidth;
  const yScale = (value: number) => chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

  // Create path strings for each area
  const createAreaPath = (data: number[], baseline: number[] = []) => {
    if (data.length === 0) return '';

    let path = `M ${xScale(0)} ${yScale(baseline[0] || 0)}`;

    // Draw top line
    for (let i = 0; i < data.length; i++) {
      path += ` L ${xScale(i)} ${yScale(data[i])}`;
    }

    // Draw bottom line (reversed)
    for (let i = data.length - 1; i >= 0; i--) {
      path += ` L ${xScale(i)} ${yScale(baseline[i] || 0)}`;
    }

    path += ' Z';
    return path;
  };

  const illiquidPath = createAreaPath(cumIlliquid);
  const liquidPath = createAreaPath(cumLiquid, cumIlliquid);
  const retirementPath = createAreaPath(cumRetirement, cumLiquid);

  // Net worth line path (not filled area)
  const createLinePath = (data: number[]) => {
    if (data.length === 0) return '';
    let path = `M ${xScale(0)} ${yScale(data[0])}`;
    for (let i = 1; i < data.length; i++) {
      path += ` L ${xScale(i)} ${yScale(data[i])}`;
    }
    return path;
  };

  const netWorthLinePath = createLinePath(netWorthData);

  // Determine if labels should thin out for readability
  const showEveryOtherLabel = sortedEntries.length > 6;

  return (
    <View style={styles.chartContainer}>
      {/* Summary Header */}
      {latestEntry && currentNetWorth !== null && (
        <View style={styles.summaryHeader}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryLabel}>Net Worth</Text>
            <Text style={styles.summaryDate}>{dateLabel}</Text>
          </View>
          <Text style={styles.summaryAmount}>
            {formatCurrency(currentNetWorth)}
          </Text>
          {change !== null && (
            <View style={styles.changeRow}>
              <Ionicons
                name={change >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={change >= 0 ? '#22C55E' : '#DC3545'}
              />
              <Text style={[styles.changeText, change >= 0 ? styles.changePositive : styles.changeNegative]}>
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
        </View>
      )}

      <Svg width={width} height={height}>
        {/* Y-axis label */}
        <SvgText
          x={12}
          y={chartHeight / 2 + padding.top}
          fontSize="11"
          fill="#666"
          fontWeight="600"
          transform={`rotate(-90, 12, ${chartHeight / 2 + padding.top})`}
        >
          Value ($k)
        </SvgText>

        {/* Grid lines - draw first so they're behind */}
        {[0.25, 0.5, 0.75, 1].map((percent, i) => {
          const y = chartHeight - percent * chartHeight;
          return (
            <SvgLine
              key={`grid-${i}`}
              x1={padding.left + 5}
              y1={y + padding.top}
              x2={width - padding.right}
              y2={y + padding.top}
              stroke="#e0e0e0"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Zero reference line (when net worth can be negative) */}
        {minValue < 0 && (
          <SvgLine
            x1={padding.left + 5}
            y1={yScale(0) + padding.top}
            x2={width - padding.right}
            y2={yScale(0) + padding.top}
            stroke="#999"
            strokeWidth="1"
          />
        )}

        {/* Filled areas - GROSS assets */}
        <Path
          d={illiquidPath}
          fill="#EAB308"
          fillOpacity={0.6}
          translateX={padding.left}
          translateY={padding.top}
        />
        <Path
          d={liquidPath}
          fill="#22C55E"
          fillOpacity={0.6}
          translateX={padding.left}
          translateY={padding.top}
        />
        <Path
          d={retirementPath}
          fill="#3B82F6"
          fillOpacity={0.6}
          translateX={padding.left}
          translateY={padding.top}
        />

        {/* Net worth trend line */}
        <Path
          d={netWorthLinePath}
          fill="none"
          stroke="#355e3b"
          strokeWidth="2.5"
          translateX={padding.left}
          translateY={padding.top}
        />
        {/* Data point dots on net worth line */}
        {netWorthData.map((value, i) => (
          <Circle
            key={`nw-dot-${i}`}
            cx={xScale(i) + padding.left}
            cy={yScale(value) + padding.top}
            r={3.5}
            fill="#355e3b"
            stroke="#fff"
            strokeWidth="1.5"
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
          const value = minValue + (maxValue - minValue) * percent;
          const y = chartHeight - percent * chartHeight;
          return (
            <SvgText
              key={`ylabel-${i}`}
              x={padding.left - 8}
              y={y + padding.top + 4}
              fontSize="11"
              fill="#333"
              fontWeight="500"
              textAnchor="end"
            >
              {formatNumberWithCommas(Math.round(value / 1000).toString())}
            </SvgText>
          );
        })}

        {/* X-axis labels */}
        {sortedEntries.map((entry, i) => {
          // Skip every other label when many data points to avoid crowding
          if (showEveryOtherLabel && i % 2 !== 0 && i !== sortedEntries.length - 1) return null;
          const date = parseDate(entry.date);
          const label = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
          return (
            <SvgText
              key={`xlabel-${i}`}
              x={xScale(i) + padding.left}
              y={height - padding.bottom + 20}
              fontSize="11"
              fill="#333"
              fontWeight="500"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Legend with category values */}
      {latestEntry ? (
        <View style={styles.legendGrid}>
          <View style={styles.legendGridItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendLabel}>Liquid</Text>
            <Text style={styles.legendValue}>{formatCompactCurrency(liquidValue)}</Text>
          </View>
          <View style={styles.legendGridItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.legendLabel}>Illiquid</Text>
            <Text style={styles.legendValue}>{formatCompactCurrency(illiquidValue)}</Text>
          </View>
          <View style={styles.legendGridItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendLabel}>Retirement</Text>
            <Text style={styles.legendValue}>{formatCompactCurrency(retirementValue)}</Text>
          </View>
          <View style={styles.legendGridItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC3545' }]} />
            <Text style={styles.legendLabel}>Debts</Text>
            <Text style={styles.legendValue}>{formatCompactCurrency(debtsValue)}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.legendRow}>
          <View style={styles.legendRowItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendLabel}>Liquid</Text>
          </View>
          <View style={styles.legendRowItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.legendLabel}>Illiquid</Text>
          </View>
          <View style={styles.legendRowItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendLabel}>Retirement</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  // Summary header
  summaryHeader: {
    marginBottom: 16,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  summaryDate: {
    fontSize: 12,
    color: '#999',
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  changePositive: {
    color: '#22C55E',
  },
  changeNegative: {
    color: '#DC3545',
  },
  changeSince: {
    fontSize: 12,
    color: '#999',
  },
  // Legend grid (with values)
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  legendGridItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    color: '#666',
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  // Simple legend row (fallback without values)
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Empty state
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
