import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import { moderateScale, scaleFontSize } from '@/lib/utils/responsive';
import { formatNumberWithCommas } from '@/lib/utils/number-formatter';

interface SpendingLineChartProps {
  daysInMonth: number;
  cumulativeSpending: number[]; // Array of cumulative spending for each day
  budgetAmount: number | null;
  idealSpending: number[]; // Array of cumulative ideal spending for each day
}

export default function SpendingLineChart({
  daysInMonth,
  cumulativeSpending,
  budgetAmount,
  idealSpending,
}: SpendingLineChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - moderateScale(48);
  const chartHeight = moderateScale(220);
  const padding = moderateScale(40);
  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;

  // Calculate max value for Y-axis
  const maxValue = useMemo(() => {
    const spendingMax = Math.max(...cumulativeSpending, 0);
    const idealMax = Math.max(...idealSpending, 0);
    const budgetVal = budgetAmount || 0;
    const max = Math.max(spendingMax, idealMax, budgetVal);
    // Round up to nearest 100 for cleaner chart
    return Math.ceil(max / 100) * 100 || 100;
  }, [cumulativeSpending, idealSpending, budgetAmount]);

  // Convert data points to SVG coordinates
  const getPoint = useMemo(() => {
    return (day: number, value: number) => {
      const x = padding + (day / daysInMonth) * graphWidth;
      const y = padding + graphHeight - (value / maxValue) * graphHeight;
      return { x, y };
    };
  }, [daysInMonth, graphWidth, graphHeight, maxValue]);

  // Generate spending line path
  const spendingPath = useMemo(() => {
    if (cumulativeSpending.length === 0) return '';
    const points = cumulativeSpending
      .map((value, index) => {
        const { x, y } = getPoint(index + 1, value);
        return `${x},${y}`;
      })
      .join(' ');
    return points;
  }, [cumulativeSpending, getPoint]);

  // Generate ideal spending line path
  const idealPath = useMemo(() => {
    if (idealSpending.length === 0) return '';
    const points = idealSpending
      .map((value, index) => {
        const { x, y } = getPoint(index + 1, value);
        return `${x},${y}`;
      })
      .join(' ');
    return points;
  }, [idealSpending, getPoint]);

  // Generate Y-axis labels
  const yAxisLabels = useMemo(() => {
    const labels = [];
    const segments = 4;
    for (let i = 0; i <= segments; i++) {
      const value = (maxValue / segments) * (segments - i);
      const y = padding + (i / segments) * graphHeight;
      labels.push({ value, y });
    }
    return labels;
  }, [maxValue]);

  // Generate X-axis labels (show every 5th day)
  const xAxisLabels = useMemo(() => {
    const labels = [];
    for (let day = 1; day <= daysInMonth; day++) {
      if (day === 1 || day === daysInMonth || day % 5 === 0) {
        const { x } = getPoint(day, 0);
        labels.push({ day, x });
      }
    }
    return labels;
  }, [daysInMonth]);

  // Get current day of month
  const currentDay = useMemo(() => {
    return new Date().getDate();
  }, []);

  if (daysInMonth === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending Trend</Text>
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {yAxisLabels.map((label, index) => (
            <Line
              key={index}
              x1={padding}
              y1={label.y}
              x2={padding + graphWidth}
              y2={label.y}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          ))}

          {/* Y-axis labels */}
          {yAxisLabels.map((label, index) => (
            <G key={`y-label-${index}`}>
            <SvgText
              x={padding - 8}
              y={label.y + 4}
              fontSize="10"
              fill="#666"
              textAnchor="end"
            >
              {label.value >= 1000
                ? `$${formatNumberWithCommas((label.value / 1000).toFixed(1))}k`
                : `$${formatNumberWithCommas(label.value.toFixed(0))}`}
            </SvgText>
            </G>
          ))}

          {/* X-axis labels */}
          {xAxisLabels.map((label, index) => (
            <G key={`x-label-${index}`}>
            <SvgText
              x={label.x}
              y={chartHeight - padding + 20}
              fontSize="10"
              fill="#666"
              textAnchor="middle"
            >
              {label.day}
            </SvgText>
            </G>
          ))}

          {/* Budget line (horizontal) */}
          {budgetAmount !== null && (
            <>
              <Line
                x1={padding}
                y1={getPoint(1, budgetAmount).y}
                x2={padding + graphWidth}
                y2={getPoint(1, budgetAmount).y}
                stroke="#4CAF50"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            </>
          )}

          {/* Ideal spending line */}
          {idealPath && budgetAmount !== null && (
            <Polyline
              points={idealPath}
              fill="none"
              stroke="#FF9800"
              strokeWidth="2"
            />
          )}

          {/* Spending line */}
          {spendingPath && (
            <Polyline
              points={spendingPath}
              fill="none"
              stroke="#355e3b"
              strokeWidth="2"
            />
          )}

          {/* Data points for spending */}
          {cumulativeSpending.map((value, index) => {
            const { x, y } = getPoint(index + 1, value);
            return (
              <Circle
                key={`spending-${index}`}
                cx={x}
                cy={y}
                r="3"
                fill="#355e3b"
                stroke="#fff"
                strokeWidth="2"
              />
            );
          })}

          {/* Data points for ideal */}
          {idealSpending.map((value, index) => {
            const { x, y } = getPoint(index + 1, value);
            return (
              <Circle
                key={`ideal-${index}`}
                cx={x}
                cy={y}
                r="2"
                fill="#FF9800"
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}

          {/* Current date marker on spending line */}
          {currentDay <= cumulativeSpending.length && cumulativeSpending.length > 0 && (
            <Circle
              cx={getPoint(currentDay, cumulativeSpending[currentDay - 1]).x}
              cy={getPoint(currentDay, cumulativeSpending[currentDay - 1]).y}
              r="6"
              fill="#2196F3"
              stroke="#fff"
              strokeWidth="2"
            />
          )}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#355e3b' }]} />
          <Text style={styles.legendText}>Spending</Text>
        </View>
        {budgetAmount !== null && (
          <>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Budget</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Ideal</Text>
            </View>
          </>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chartContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});

