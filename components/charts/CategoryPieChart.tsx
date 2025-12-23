import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Expense } from '@/types/database';
import { moderateScale, scaleFontSize } from '@/lib/utils/responsive';

interface CategoryPieChartProps {
  expenses: Expense[];
}

interface CategoryData {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: keyof typeof Ionicons.glyphMap;
  total: number;
  percentage: number;
}

export default function CategoryPieChart({ expenses }: CategoryPieChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartSize = Math.min(screenWidth - moderateScale(64), moderateScale(250));
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = chartSize / 2 - moderateScale(20);

  // Group expenses by category and calculate totals
  const categoryData = useMemo(() => {
    const categoryMap: { [key: string]: CategoryData } = {};

    expenses.forEach((expense) => {
      const categoryId = expense.category.id;
      if (!categoryMap[categoryId]) {
        categoryMap[categoryId] = {
          categoryId,
          categoryName: expense.category.name,
          categoryColor: expense.category.color,
          categoryIcon: expense.category.icon,
          total: 0,
          percentage: 0,
        };
      }
      categoryMap[categoryId].total += parseFloat(expense.amount);
    });

    // Calculate total and percentages
    const total = Object.values(categoryMap).reduce((sum, cat) => sum + cat.total, 0);
    const categories = Object.values(categoryMap)
      .map((cat) => ({
        ...cat,
        percentage: total > 0 ? (cat.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total); // Sort by total descending

    return { categories, total };
  }, [expenses]);

  // Generate pie chart paths
  const piePaths = useMemo(() => {
    if (categoryData.categories.length === 0) return [];

    let currentAngle = -90; // Start at top (12 o'clock)
    const paths: Array<{
      path: string;
      color: string;
      categoryId: string;
    }> = [];

    categoryData.categories.forEach((cat) => {
      const angle = (cat.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      // Convert angles to radians
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;

      // Calculate start and end points
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);

      // Large arc flag (1 if angle > 180, 0 otherwise)
      const largeArcFlag = angle > 180 ? 1 : 0;

      // Create path
      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      paths.push({
        path,
        color: cat.categoryColor,
        categoryId: cat.categoryId,
      });

      currentAngle = endAngle;
    });

    return paths;
  }, [categoryData.categories, centerX, centerY, radius]);

  if (categoryData.categories.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No expenses to display</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending by Category</Text>
      <View style={styles.chartContainer}>
        <View style={styles.chartWrapper}>
          <Svg width={chartSize} height={chartSize}>
            <G>
              {piePaths.map((piePath, index) => (
                <Path
                  key={piePath.categoryId}
                  d={piePath.path}
                  fill={piePath.color}
                  stroke="#fff"
                  strokeWidth="2"
                />
              ))}
            </G>
            {/* Center circle for donut effect */}
            <Circle cx={centerX} cy={centerY} r={radius * 0.6} fill="#fff" />
          </Svg>
          {/* Center text overlay */}
          <View style={styles.centerTextContainer}>
            <Text style={styles.centerAmount}>
              ${categoryData.total.toFixed(0)}
            </Text>
            <Text style={styles.centerLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {categoryData.categories.map((cat) => (
          <View key={cat.categoryId} style={styles.legendItem}>
            <View style={styles.legendLeft}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: cat.categoryColor },
                ]}
              />
              <Ionicons
                name={cat.categoryIcon}
                size={16}
                color={cat.categoryColor}
                style={styles.legendIcon}
              />
              <Text style={styles.legendText}>{cat.categoryName}</Text>
            </View>
            <View style={styles.legendRight}>
              <Text style={styles.legendAmount}>${cat.total.toFixed(2)}</Text>
              <Text style={[styles.legendPercentage, { marginLeft: 12 }]}>
                {cat.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
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
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  centerLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  legend: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendIcon: {
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 70,
    textAlign: 'right',
  },
  legendPercentage: {
    fontSize: 12,
    color: '#666',
    minWidth: 45,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
});

