import { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { useNetWorth, NetWorthEntryCompat } from '@/hooks/useNetWorth';
import {
  NetWorthItem,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculateRetirementAssets,
  calculateRetirementLiabilities,
  calculateRetirementNetWorth,
  calculateLiquidAssets,
  calculateLiquidLiabilities,
  calculateLiquidNetWorth,
  calculateIlliquidAssets,
  calculateIlliquidLiabilities,
  calculateIlliquidNetWorth,
  formatDate,
  parseDate,
} from '@/lib/net-worth-db';
import * as Crypto from 'expo-crypto';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Path, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import UndoToast from '@/components/UndoToast';
import CalendarPicker from '@/components/CalendarPicker';
import CalculatorKeypad from '@/components/CalculatorKeypad';

type ActiveFieldType = 'liquid' | 'illiquid' | 'retirement' | 'liability';

interface ActiveField {
  id: string;
  type: ActiveFieldType;
}

export default function NetWorthScreen() {
  const { entries, loading, saveEntry, deleteEntry } = useNetWorth();
  const [viewMode, setViewMode] = useState<'chart' | 'entry'>('chart');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deletedEntry, setDeletedEntry] = useState<NetWorthEntryCompat | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [calculatorAmount, setCalculatorAmount] = useState('0');

  // Current date in YYYY-MM-DD format
  const currentDate = useMemo(() => new Date(), []);
  const currentDateStr = useMemo(() => formatDate(currentDate), []);

  // Find entry for selected date
  const selectedEntry = useMemo(() => {
    const dateStr = formatDate(selectedDate);
    return entries.find((e) => e.date === dateStr);
  }, [entries, selectedDate]);

  // Find the most recent entry (for prepopulation)
  const mostRecentEntry = useMemo(() => {
    if (entries.length === 0) return null;
    return entries[0]; // Already sorted newest first
  }, [entries]);

  // Determine if prepopulation note should show
  const shouldShowPrepopulationNote = useMemo(() => {
    if (!mostRecentEntry || selectedEntry) return false;
    const selectedDateStr = formatDate(selectedDate);
    return selectedDateStr !== mostRecentEntry.date;
  }, [mostRecentEntry, selectedEntry, selectedDate]);

  // Helper to generate unique ID
  const generateId = (): string => {
    try {
      return Crypto.randomUUID();
    } catch (err) {
      return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  };

  // Form state for entry view - organized by category
  const [liquidAssets, setLiquidAssets] = useState<NetWorthItem[]>([
    { id: '1', name: 'Savings', amount: '0' },
  ]);
  const [illiquidAssets, setIlliquidAssets] = useState<NetWorthItem[]>([
    { id: '1', name: 'Real Estate', amount: '0' },
  ]);
  const [retirementAssets, setRetirementAssets] = useState<NetWorthItem[]>([
    { id: '1', name: 'Retirement', amount: '0' },
  ]);
  const [liabilities, setLiabilities] = useState<NetWorthItem[]>([
    { id: '1', name: 'Credit Card Debt', amount: '0' },
  ]);
  const [notes, setNotes] = useState('');

  // Update form data when selected entry changes
  useEffect(() => {
    if (selectedEntry) {
      // Categorize assets from the entry
      const liquidAssetNames = ['Savings', 'Checking', 'Investments'];
      const illiquidAssetNames = ['Real Estate', 'Vehicles', 'Other Assets'];
      const retirementAssetNames = ['Retirement', '401k', 'IRA'];

      const liquid = selectedEntry.assets.filter(a => liquidAssetNames.includes(a.name));
      const illiquid = selectedEntry.assets.filter(a => illiquidAssetNames.includes(a.name));
      const retirement = selectedEntry.assets.filter(a => retirementAssetNames.includes(a.name));

      setLiquidAssets(liquid);
      setIlliquidAssets(illiquid);
      setRetirementAssets(retirement);
      setLiabilities(selectedEntry.liabilities);
      setNotes(selectedEntry.notes);
    } else if (mostRecentEntry) {
      // Prepopulate from most recent entry
      const liquidAssetNames = ['Savings', 'Checking', 'Investments'];
      const illiquidAssetNames = ['Real Estate', 'Vehicles', 'Other Assets'];
      const retirementAssetNames = ['Retirement', '401k', 'IRA'];

      const liquid = mostRecentEntry.assets.filter(a => liquidAssetNames.includes(a.name));
      const illiquid = mostRecentEntry.assets.filter(a => illiquidAssetNames.includes(a.name));
      const retirement = mostRecentEntry.assets.filter(a => retirementAssetNames.includes(a.name));

      // Generate new IDs to prevent conflicts
      setLiquidAssets(liquid.map(item => ({ ...item, id: generateId() })));
      setIlliquidAssets(illiquid.map(item => ({ ...item, id: generateId() })));
      setRetirementAssets(retirement.map(item => ({ ...item, id: generateId() })));
      setLiabilities(mostRecentEntry.liabilities.map(item => ({ ...item, id: generateId() })));
      setNotes(''); // Clear notes (date-specific)
    } else {
      // Reset form for new entry - start with one item in each category
      setLiquidAssets([{ id: generateId(), name: 'Savings', amount: '0' }]);
      setIlliquidAssets([{ id: generateId(), name: 'Real Estate', amount: '0' }]);
      setRetirementAssets([{ id: generateId(), name: 'Retirement', amount: '0' }]);
      setLiabilities([{ id: generateId(), name: 'Credit Card Debt', amount: '0' }]);
      setNotes('');
    }
  }, [selectedEntry, mostRecentEntry]);

  // Calculate chart data with stacked areas (approximation)
  const chartData = useMemo(() => {
    if (entries.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [0] }],
        legend: ['Illiquid', 'Liquid', 'Retirement', 'Liabilities'],
      };
    }

    // Sort by date and take last 6 entries
    const sortedEntries = [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6);

    // Calculate cumulative values for stacked effect
    // Bottom to top: Illiquid, then add Liquid, then add Retirement, then subtract Liabilities
    const illiquidValues = sortedEntries.map((e) => calculateIlliquidNetWorth(e));
    const illiquidPlusLiquid = sortedEntries.map((e) =>
      calculateIlliquidNetWorth(e) + calculateLiquidNetWorth(e)
    );
    const totalAssets = sortedEntries.map((e) =>
      calculateIlliquidNetWorth(e) + calculateLiquidNetWorth(e) + calculateRetirementNetWorth(e)
    );
    const totalNetWorth = sortedEntries.map((e) =>
      calculateNetWorth(e)
    );

    return {
      labels: sortedEntries.map((e) => {
        const date = parseDate(e.date);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}`;
      }),
      datasets: [
        {
          data: illiquidValues,
          color: (opacity = 1) => `rgba(234, 179, 8, ${opacity})`, // Yellow for Illiquid
          strokeWidth: 2,
        },
        {
          data: illiquidPlusLiquid,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green for Liquid
          strokeWidth: 2,
        },
        {
          data: totalAssets,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue for Retirement
          strokeWidth: 2,
        },
        {
          data: totalNetWorth,
          color: (opacity = 1) => `rgba(220, 53, 69, ${opacity})`, // Red line for Net Worth (after liabilities)
          strokeWidth: 3,
          strokeDasharray: [5, 5], // Dashed line to distinguish
        },
      ],
      legend: ['Illiquid', 'Liquid', 'Retirement', 'Net Worth'],
    };
  }, [entries]);

  const handleSave = async () => {
    try {
      // Combine all asset categories into one array
      const allAssets = [...liquidAssets, ...illiquidAssets, ...retirementAssets];
      const dateStr = formatDate(selectedDate);

      await saveEntry({
        date: dateStr,
        assets: allAssets,
        liabilities,
        notes,
      });
      Alert.alert('Success', 'Net worth entry saved successfully!');
      setViewMode('chart');
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    }
  };

  // Add/Update/Delete functions for liquid assets
  const addLiquidAsset = () => {
    const newAsset: NetWorthItem = {
      id: generateId(),
      name: '',
      amount: '0',
    };
    setLiquidAssets([...liquidAssets, newAsset]);
  };

  const updateLiquidAsset = (id: string, field: 'name' | 'amount', value: string) => {
    setLiquidAssets(liquidAssets.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLiquidAsset = (id: string) => {
    setLiquidAssets(liquidAssets.filter(item => item.id !== id));
  };

  // Add/Update/Delete functions for illiquid assets
  const addIlliquidAsset = () => {
    const newAsset: NetWorthItem = {
      id: generateId(),
      name: '',
      amount: '0',
    };
    setIlliquidAssets([...illiquidAssets, newAsset]);
  };

  const updateIlliquidAsset = (id: string, field: 'name' | 'amount', value: string) => {
    setIlliquidAssets(illiquidAssets.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeIlliquidAsset = (id: string) => {
    setIlliquidAssets(illiquidAssets.filter(item => item.id !== id));
  };

  // Add/Update/Delete functions for retirement assets
  const addRetirementAsset = () => {
    const newAsset: NetWorthItem = {
      id: generateId(),
      name: '',
      amount: '0',
    };
    setRetirementAssets([...retirementAssets, newAsset]);
  };

  const updateRetirementAsset = (id: string, field: 'name' | 'amount', value: string) => {
    setRetirementAssets(retirementAssets.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeRetirementAsset = (id: string) => {
    setRetirementAssets(retirementAssets.filter(item => item.id !== id));
  };

  const addLiability = () => {
    const newLiability: NetWorthItem = {
      id: generateId(),
      name: '',
      amount: '0',
    };
    setLiabilities([...liabilities, newLiability]);
  };

  const updateLiability = (id: string, field: 'name' | 'amount', value: string) => {
    setLiabilities(liabilities.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLiability = (id: string) => {
    setLiabilities(liabilities.filter(item => item.id !== id));
  };

  // Calculator keypad handlers
  const handleAmountFieldPress = (id: string, type: ActiveFieldType, currentAmount: string) => {
    setActiveField({ id, type });
    setCalculatorAmount(currentAmount === '0' ? '0' : currentAmount);
  };

  const handleCalculatorNumberPress = (num: string) => {
    if (calculatorAmount === '0') {
      setCalculatorAmount(num);
    } else {
      setCalculatorAmount(calculatorAmount + num);
    }
  };

  const handleCalculatorDecimalPress = () => {
    if (!calculatorAmount.includes('.')) {
      setCalculatorAmount(calculatorAmount + '.');
    }
  };

  const handleCalculatorBackspace = () => {
    if (calculatorAmount.length === 1) {
      setCalculatorAmount('0');
    } else {
      setCalculatorAmount(calculatorAmount.slice(0, -1));
    }
  };

  const handleCalculatorClear = () => {
    setCalculatorAmount('0');
  };

  const handleCalculatorDone = () => {
    if (activeField) {
      // Update the appropriate field based on type
      switch (activeField.type) {
        case 'liquid':
          updateLiquidAsset(activeField.id, 'amount', calculatorAmount);
          break;
        case 'illiquid':
          updateIlliquidAsset(activeField.id, 'amount', calculatorAmount);
          break;
        case 'retirement':
          updateRetirementAsset(activeField.id, 'amount', calculatorAmount);
          break;
        case 'liability':
          updateLiability(activeField.id, 'amount', calculatorAmount);
          break;
      }
      setActiveField(null);
      setCalculatorAmount('0');
    }
  };

  // Handle tapping an entry to edit it
  const handleEntryTap = (entry: NetWorthEntryCompat) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(parseDate(entry.date));
    setViewMode('entry');
  };

  // Handle long press for edit/delete options
  const handleEntryLongPress = (entry: NetWorthEntryCompat) => {
    Alert.alert(
      'Entry Options',
      `${parseDate(entry.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}`,
      [
        {
          text: 'Edit',
          onPress: () => handleEntryTap(entry),
        },
        {
          text: 'Delete',
          onPress: () => handleDeleteWithUndo(entry),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Handle swipe delete
  const handleSwipeDelete = (entry: NetWorthEntryCompat) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleDeleteWithUndo(entry);
  };

  // Delete with undo functionality
  const handleDeleteWithUndo = async (entry: NetWorthEntryCompat) => {
    setDeletedEntry(entry);

    try {
      await deleteEntry(entry.date);
    } catch (err) {
      console.error('Failed to delete entry:', err);
      Alert.alert('Error', 'Failed to delete entry. Please try again.');
      return;
    }

    setUndoVisible(true);

    setTimeout(() => {
      setDeletedEntry(null);
    }, 4000);
  };

  // Undo delete
  const handleUndo = async () => {
    if (!deletedEntry) return;

    setUndoVisible(false);

    try {
      await saveEntry({
        date: deletedEntry.date,
        assets: deletedEntry.assets,
        liabilities: deletedEntry.liabilities,
        notes: deletedEntry.notes,
      });
    } catch (err) {
      console.error('Failed to undo delete:', err);
      Alert.alert('Error', 'Failed to restore entry. Please try again.');
    }

    setDeletedEntry(null);
  };

  // Render swipe delete action
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
          onPress={() => handleSwipeDelete(entry)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={24} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Calculate totals from form
  const formLiquidAssets = liquidAssets.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const formIlliquidAssets = illiquidAssets.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const formRetirementAssets = retirementAssets.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const formTotalAssets = formLiquidAssets + formIlliquidAssets + formRetirementAssets;
  const formLiabilities = liabilities.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const formNetWorth = formTotalAssets - formLiabilities;

  return (
    <View style={styles.container}>
      {/* Header with view toggle */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Net Worth</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'chart' && styles.toggleButtonActive]}
            onPress={() => setViewMode('chart')}
          >
            <Ionicons
              name="bar-chart"
              size={20}
              color={viewMode === 'chart' ? '#fff' : '#666'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'entry' && styles.toggleButtonActive]}
            onPress={() => setViewMode('entry')}
          >
            <Ionicons
              name="create"
              size={20}
              color={viewMode === 'entry' ? '#fff' : '#666'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'chart' ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Net Worth Summary */}
          {entries.find(e => e.date === currentDateStr) && (() => {
            const currentEntry = entries.find(e => e.date === currentDateStr)!;
            return (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Current Net Worth</Text>
                <Text style={styles.summaryAmount}>
                  ${calculateNetWorth(currentEntry).toLocaleString()}
                </Text>
                <View style={styles.summaryBreakdown}>
                  <View style={styles.summaryCategory}>
                    <View style={[styles.categoryIndicator, {backgroundColor: '#22C55E'}]} />
                    <Text style={styles.summaryCategoryTitle}>Liquid</Text>
                    <Text style={[styles.summaryCompactValue, calculateLiquidNetWorth(currentEntry) >= 0 ? styles.positiveValue : styles.negativeValue]}>
                      ${Math.abs(calculateLiquidNetWorth(currentEntry)).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.summaryCategory}>
                    <View style={[styles.categoryIndicator, {backgroundColor: '#EAB308'}]} />
                    <Text style={styles.summaryCategoryTitle}>Illiquid</Text>
                    <Text style={[styles.summaryCompactValue, calculateIlliquidNetWorth(currentEntry) >= 0 ? styles.positiveValue : styles.negativeValue]}>
                      ${Math.abs(calculateIlliquidNetWorth(currentEntry)).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.summaryCategory}>
                    <View style={[styles.categoryIndicator, {backgroundColor: '#3B82F6'}]} />
                    <Text style={styles.summaryCategoryTitle}>Retirement</Text>
                    <Text style={[styles.summaryCompactValue, calculateRetirementNetWorth(currentEntry) >= 0 ? styles.positiveValue : styles.negativeValue]}>
                      ${Math.abs(calculateRetirementNetWorth(currentEntry)).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.summaryCategory}>
                    <View style={[styles.categoryIndicator, {backgroundColor: '#DC3545'}]} />
                    <Text style={styles.summaryCategoryTitle}>Liabilities</Text>
                    <Text style={[styles.summaryCompactValue, styles.negativeValue]}>
                      ${calculateTotalLiabilities(currentEntry).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Chart */}
          {entries.length > 0 ? (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Assets & Liabilities Over Time</Text>
              {(() => {
                const width = Dimensions.get('window').width - 64;
                const height = 220;
                const padding = { top: 20, right: 20, bottom: 40, left: 60 };
                const chartWidth = width - padding.left - padding.right;
                const chartHeight = height - padding.top - padding.bottom;

                const sortedEntries = [...entries]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(-6);

                // Calculate GROSS assets per category (not net)
                const illiquidData = sortedEntries.map(e => calculateIlliquidAssets(e));
                const liquidData = sortedEntries.map(e => calculateLiquidAssets(e));
                const retirementData = sortedEntries.map(e => calculateRetirementAssets(e));

                // Cumulative stacking for gross assets
                const cumIlliquid = illiquidData;
                const cumLiquid = illiquidData.map((v, i) => v + liquidData[i]);
                const cumRetirement = cumLiquid.map((v, i) => v + retirementData[i]);

                // Find max value for scaling
                const maxValue = Math.max(...cumRetirement);
                const minValue = 0;

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

                return (
                  <>
                    <Svg width={width} height={height}>
                      {/* Y-axis label */}
                      <SvgText x={12} y={chartHeight / 2 + padding.top} fontSize="11" fill="#666" fontWeight="600" transform={`rotate(-90, 12, ${chartHeight / 2 + padding.top})`}>
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
                            {Math.round(value / 1000)}
                          </SvgText>
                        );
                      })}

                      {/* X-axis labels */}
                      {sortedEntries.map((entry, i) => {
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

                    <View style={styles.chartLegend}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
                        <Text style={styles.legendText}>Retirement</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#22C55E' }]} />
                        <Text style={styles.legendText}>Liquid</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#EAB308' }]} />
                        <Text style={styles.legendText}>Illiquid</Text>
                      </View>
                    </View>
                  </>
                );
              })()}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No data yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Switch to Entry view to add your first net worth entry
              </Text>
            </View>
          )}

          {/* History */}
          {entries.length > 0 && (
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
                    onPress={() => handleEntryTap(entry)}
                    onLongPress={() => handleEntryLongPress(entry)}
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
                          Assets: ${calculateTotalAssets(entry).toLocaleString()}
                        </Text>
                        <Text style={styles.historyDetail}>
                          Liabilities: ${calculateTotalLiabilities(entry).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyValue}>
                      ${calculateNetWorth(entry).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                </Swipeable>
              ))}
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.entryContainer}>
            {/* Date Selector */}
            <View style={styles.dateSelector}>
              <TouchableOpacity
                style={styles.dateDisplayButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#333" />
                <Text style={styles.dateDisplayText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Prepopulation Note */}
            {shouldShowPrepopulationNote && mostRecentEntry && (
              <View style={styles.prepopulationNote}>
                <Ionicons name="information-circle" size={16} color="#355e3b" />
                <Text style={styles.prepopulationText}>
                  Prepopulated from{' '}
                  {parseDate(mostRecentEntry.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            )}

            {/* Assets Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assets</Text>

              {/* Liquid Assets Subcategory */}
              <View style={[styles.subcategory, liquidAssets.length === 0 && styles.emptySubcategory]}>
                <View style={styles.subcategoryHeader}>
                  <View style={[styles.categoryIndicator, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.subcategoryTitle}>Liquid</Text>
                  <TouchableOpacity onPress={addLiquidAsset} style={styles.addButton}>
                    <Ionicons name="add-circle" size={24} color="#22C55E" />
                  </TouchableOpacity>
                </View>

                {liquidAssets.map((asset) => (
                  <View key={asset.id} style={styles.itemRow}>
                    <TextInput
                      style={styles.nameInput}
                      value={asset.name}
                      onChangeText={(value) => updateLiquidAsset(asset.id, 'name', value)}
                      placeholder="Asset name"
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      style={styles.amountInputContainer}
                      onPress={() => handleAmountFieldPress(asset.id, 'liquid', asset.amount)}
                    >
                      <Text style={styles.dollarSign}>$</Text>
                      <Text style={styles.amountInputText}>
                        {asset.amount || '0.00'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeLiquidAsset(asset.id)} style={styles.deleteButton}>
                      <Ionicons name="remove-circle" size={24} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                ))}

                {liquidAssets.length > 0 && (
                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Liquid Assets</Text>
                    <Text style={styles.subtotalValue}>
                      ${formLiquidAssets.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Illiquid Assets Subcategory */}
              <View style={[styles.subcategory, illiquidAssets.length === 0 && styles.emptySubcategory]}>
                <View style={styles.subcategoryHeader}>
                  <View style={[styles.categoryIndicator, { backgroundColor: '#EAB308' }]} />
                  <Text style={styles.subcategoryTitle}>Illiquid</Text>
                  <TouchableOpacity onPress={addIlliquidAsset} style={styles.addButton}>
                    <Ionicons name="add-circle" size={24} color="#EAB308" />
                  </TouchableOpacity>
                </View>

                {illiquidAssets.map((asset) => (
                  <View key={asset.id} style={styles.itemRow}>
                    <TextInput
                      style={styles.nameInput}
                      value={asset.name}
                      onChangeText={(value) => updateIlliquidAsset(asset.id, 'name', value)}
                      placeholder="Asset name"
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      style={styles.amountInputContainer}
                      onPress={() => handleAmountFieldPress(asset.id, 'illiquid', asset.amount)}
                    >
                      <Text style={styles.dollarSign}>$</Text>
                      <Text style={styles.amountInputText}>
                        {asset.amount || '0.00'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeIlliquidAsset(asset.id)} style={styles.deleteButton}>
                      <Ionicons name="remove-circle" size={24} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                ))}

                {illiquidAssets.length > 0 && (
                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Illiquid Assets</Text>
                    <Text style={styles.subtotalValue}>
                      ${formIlliquidAssets.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Retirement Assets Subcategory */}
              <View style={[styles.subcategory, retirementAssets.length === 0 && styles.emptySubcategory]}>
                <View style={styles.subcategoryHeader}>
                  <View style={[styles.categoryIndicator, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.subcategoryTitle}>Retirement</Text>
                  <TouchableOpacity onPress={addRetirementAsset} style={styles.addButton}>
                    <Ionicons name="add-circle" size={24} color="#3B82F6" />
                  </TouchableOpacity>
                </View>

                {retirementAssets.map((asset) => (
                  <View key={asset.id} style={styles.itemRow}>
                    <TextInput
                      style={styles.nameInput}
                      value={asset.name}
                      onChangeText={(value) => updateRetirementAsset(asset.id, 'name', value)}
                      placeholder="Asset name"
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      style={styles.amountInputContainer}
                      onPress={() => handleAmountFieldPress(asset.id, 'retirement', asset.amount)}
                    >
                      <Text style={styles.dollarSign}>$</Text>
                      <Text style={styles.amountInputText}>
                        {asset.amount || '0.00'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeRetirementAsset(asset.id)} style={styles.deleteButton}>
                      <Ionicons name="remove-circle" size={24} color="#DC3545" />
                    </TouchableOpacity>
                  </View>
                ))}

                {retirementAssets.length > 0 && (
                  <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Retirement Assets</Text>
                    <Text style={styles.subtotalValue}>
                      ${formRetirementAssets.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Total Assets */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Assets</Text>
                <Text style={styles.totalValue}>
                  ${formTotalAssets.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Liabilities Section */}
            <View style={[styles.section, liabilities.length === 0 && styles.emptySection]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Liabilities</Text>
                <TouchableOpacity onPress={addLiability} style={styles.addButton}>
                  <Ionicons name="add-circle" size={28} color="#355e3b" />
                </TouchableOpacity>
              </View>

              {liabilities.map((liability) => (
                <View key={liability.id} style={styles.itemRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={liability.name}
                    onChangeText={(value) => updateLiability(liability.id, 'name', value)}
                    placeholder="Liability name"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.amountInputContainer}
                    onPress={() => handleAmountFieldPress(liability.id, 'liability', liability.amount)}
                  >
                    <Text style={styles.dollarSign}>$</Text>
                    <Text style={styles.amountInputText}>
                      {liability.amount || '0.00'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeLiability(liability.id)} style={styles.deleteButton}>
                    <Ionicons name="remove-circle" size={24} color="#DC3545" />
                  </TouchableOpacity>
                </View>
              ))}

              {liabilities.length > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Liabilities</Text>
                  <Text style={styles.totalValue}>
                    ${formLiabilities.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>

            {/* Net Worth */}
            <View style={styles.netWorthCard}>
              <Text style={styles.netWorthLabel}>Net Worth</Text>
              <Text style={[styles.netWorthValue, formNetWorth < 0 && styles.negativeValue]}>
                ${formNetWorth.toLocaleString()}
              </Text>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this month..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </ScrollView>

        {/* Sticky Save Button */}
        <View style={styles.stickyButtonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>
        </>
      )}

      {/* Calendar Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <CalendarPicker
          currentDate={selectedDate}
          onConfirm={(date) => {
            setSelectedDate(date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />
      </Modal>

      <UndoToast
        visible={undoVisible}
        message="Entry deleted"
        onUndo={handleUndo}
        onDismiss={() => setUndoVisible(false)}
      />

      {/* Calculator Keypad Modal */}
      {activeField && (
        <View style={styles.calculatorOverlay}>
          <TouchableOpacity
            style={styles.calculatorBackdrop}
            onPress={handleCalculatorDone}
            activeOpacity={1}
          />
          <View style={styles.calculatorContainer}>
            <View style={styles.calculatorHeader}>
              <Text style={styles.calculatorTitle}>Enter Amount</Text>
              <TouchableOpacity onPress={handleCalculatorDone}>
                <Ionicons name="checkmark-circle" size={32} color="#355e3b" />
              </TouchableOpacity>
            </View>
            <CalculatorKeypad
              amount={calculatorAmount}
              onNumberPress={handleCalculatorNumberPress}
              onDecimalPress={handleCalculatorDecimalPress}
              onBackspace={handleCalculatorBackspace}
              onClear={handleCalculatorClear}
            />
            <View style={styles.calculatorBottomSpacer} />
          </View>
        </View>
      )}
    </View>
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
    paddingVertical: 20,
    paddingTop: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#355e3b',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80,
  },
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
  summaryCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryCategoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  summaryCategoryDetails: {
    gap: 4,
  },
  summaryDetailText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  summaryDetailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
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
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
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
  entryContainer: {
    padding: 16,
  },
  entryMonth: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    minWidth: 200,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  subcategory: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  emptySubcategory: {
    marginBottom: 8,
    paddingBottom: 4,
  },
  subcategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subcategoryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addButton: {
    padding: 4,
  },
  emptySection: {
    paddingBottom: 8,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  subtotalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#355e3b',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    width: 130,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  deleteButton: {
    padding: 4,
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  netWorthCard: {
    backgroundColor: '#355e3b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  netWorthLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 8,
  },
  netWorthValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  notesInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#355e3b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dateDisplayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateDisplayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  prepopulationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f7f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: -4,
    borderWidth: 1,
    borderColor: '#d4e8d7',
  },
  prepopulationText: {
    fontSize: 13,
    color: '#355e3b',
    fontWeight: '500',
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
  amountInputText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  calculatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  calculatorBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calculatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  calculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  calculatorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  calculatorBottomSpacer: {
    height: 40,
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
});
