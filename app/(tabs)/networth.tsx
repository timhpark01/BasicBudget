import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNetWorth, NetWorthEntryCompat } from '@/hooks/useNetWorth';
import { formatDate, parseDate } from '@/lib/db/models/net-worth';
import UndoToast from '@/components/shared/UndoToast';
import CalendarPicker from '@/components/shared/CalendarPicker';
import NetWorthSummaryCard from '@/components/networth/NetWorthSummaryCard';
import NetWorthChart from '@/components/networth/NetWorthChart';
import NetWorthHistoryList from '@/components/networth/NetWorthHistoryList';
import NetWorthEntryForm from '@/components/networth/NetWorthEntryForm';
import { useNetWorthCalculator } from '@/components/networth/useNetWorthCalculator';
import { moderateScale, scaleFontSize } from '@/lib/utils/responsive';

export default function NetWorthScreen() {
  // Responsive sizing
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { entries, loading, saveEntry, deleteEntry } = useNetWorth();
  const [viewMode, setViewMode] = useState<'chart' | 'entry'>('chart');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deletedEntry, setDeletedEntry] = useState<NetWorthEntryCompat | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);

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

  // Use the calculator hook for all form state
  const calculator = useNetWorthCalculator({
    selectedEntry,
    mostRecentEntry,
  });

  const handleSave = async () => {
    try {
      // Combine all asset categories into one array
      const allAssets = [
        ...calculator.liquidAssets,
        ...calculator.illiquidAssets,
        ...calculator.retirementAssets,
      ];
      const dateStr = formatDate(selectedDate);

      await saveEntry({
        date: dateStr,
        assets: allAssets,
        liabilities: calculator.liabilities,
        notes: calculator.notes,
      });
      Alert.alert('Success', 'Net worth entry saved successfully!');
      setViewMode('chart');
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
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

  // Find current entry for summary card
  const currentEntry = entries.find(e => e.date === currentDateStr);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: moderateScale(100) }}
        >
          {/* Net Worth Summary */}
          {currentEntry && <NetWorthSummaryCard entry={currentEntry} />}

          {/* Chart */}
          <NetWorthChart entries={entries} />

          {/* History */}
          <NetWorthHistoryList
            entries={entries}
            onEntryTap={handleEntryTap}
            onEntryLongPress={handleEntryLongPress}
            onSwipeDelete={handleSwipeDelete}
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <NetWorthEntryForm
          selectedDate={selectedDate}
          onDatePress={() => setShowDatePicker(true)}
          showPrepopulationNote={shouldShowPrepopulationNote}
          prepopulationDate={
            mostRecentEntry
              ? parseDate(mostRecentEntry.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : undefined
          }
          liquidAssets={calculator.liquidAssets}
          illiquidAssets={calculator.illiquidAssets}
          retirementAssets={calculator.retirementAssets}
          onAddLiquidAsset={calculator.addLiquidAsset}
          onUpdateLiquidAsset={calculator.updateLiquidAsset}
          onRemoveLiquidAsset={calculator.removeLiquidAsset}
          onAddIlliquidAsset={calculator.addIlliquidAsset}
          onUpdateIlliquidAsset={calculator.updateIlliquidAsset}
          onRemoveIlliquidAsset={calculator.removeIlliquidAsset}
          onAddRetirementAsset={calculator.addRetirementAsset}
          onUpdateRetirementAsset={calculator.updateRetirementAsset}
          onRemoveRetirementAsset={calculator.removeRetirementAsset}
          liabilities={calculator.liabilities}
          onAddLiability={calculator.addLiability}
          onUpdateLiability={calculator.updateLiability}
          onRemoveLiability={calculator.removeLiability}
          notes={calculator.notes}
          onNotesChange={calculator.setNotes}
          activeField={calculator.activeField}
          calculatorAmount={calculator.calculatorAmount}
          onAmountFieldPress={calculator.handleAmountFieldPress}
          onCalculatorNumberPress={calculator.handleCalculatorNumberPress}
          onCalculatorDecimalPress={calculator.handleCalculatorDecimalPress}
          onCalculatorBackspace={calculator.handleCalculatorBackspace}
          onCalculatorClear={calculator.handleCalculatorClear}
          onCalculatorDone={calculator.handleCalculatorDone}
          formLiquidAssets={calculator.formLiquidAssets}
          formIlliquidAssets={calculator.formIlliquidAssets}
          formRetirementAssets={calculator.formRetirementAssets}
          formTotalAssets={calculator.formTotalAssets}
          formLiabilities={calculator.formLiabilities}
          formNetWorth={calculator.formNetWorth}
          onSave={handleSave}
        />
      )}

      {/* Calendar Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="fade"
        transparent={true}
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
    </SafeAreaView>
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
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(16),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: scaleFontSize(24, 20, 28),
    fontWeight: '700',
    color: '#333',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: moderateScale(8),
    padding: moderateScale(2),
  },
  toggleButton: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(6),
  },
  toggleButtonActive: {
    backgroundColor: '#355e3b',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80,
  },
  bottomSpacer: {
    height: 40,
  },
});
