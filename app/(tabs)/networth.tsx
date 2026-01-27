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
import NetWorthChart from '@/components/networth/NetWorthChart';
import NetWorthHistoryList from '@/components/networth/NetWorthHistoryList';
import NetWorthEntryForm from '@/components/networth/NetWorthEntryForm';
import { useNetWorthCalculator } from '@/components/networth/useNetWorthCalculator';
import { moderateScale, scaleWidth } from '@/lib/utils/responsive';

export default function NetWorthScreen() {
  // Responsive sizing
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { entries, loading, saveEntry, deleteEntry } = useNetWorth();
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deletedEntry, setDeletedEntry] = useState<NetWorthEntryCompat | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);

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
    return !isEditing && mostRecentEntry !== null;
  }, [isEditing, mostRecentEntry]);

  // Use the calculator hook for all form state
  // When creating (!isEditing), don't pass selectedEntry so the hook prepopulates from mostRecentEntry
  const calculator = useNetWorthCalculator({
    selectedEntry: isEditing ? selectedEntry : undefined,
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
      setShowEntryModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    }
  };

  // Handle tapping an entry to edit it
  const handleEntryTap = (entry: NetWorthEntryCompat) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(parseDate(entry.date));
    setIsEditing(true);
    setShowEntryModal(true);
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

  // Most recent entry for summary card (entries sorted newest-first from hook)
  const latestEntry = entries.length > 0 ? entries[0] : null;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: moderateScale(100) }}
      >
        {/* Chart with inline summary */}
        <NetWorthChart
          entries={entries}
          latestEntry={latestEntry}
          previousEntry={entries.length > 1 ? entries[1] : null}
        />

        {/* History */}
        <NetWorthHistoryList
          entries={entries}
          onEntryTap={handleEntryTap}
          onEntryLongPress={handleEntryLongPress}
          onSwipeDelete={handleSwipeDelete}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, {
          bottom: moderateScale(100),
          right: moderateScale(20),
          width: scaleWidth(56),
          height: scaleWidth(56),
          borderRadius: scaleWidth(56) / 2,
        }]}
        onPress={() => {
          setSelectedDate(new Date());
          setIsEditing(false);
          setShowEntryModal(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={scaleWidth(28)} color="#fff" />
      </TouchableOpacity>

      {/* Entry Form Modal */}
      <Modal
        visible={showEntryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowEntryModal(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEntryModal(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEditing ? 'Edit Entry' : 'Create Entry'}
            </Text>
            <View style={{ width: 28 }} />
          </View>
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
          {/* Calendar Picker Modal (inside entry modal so it layers on top) */}
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
        </View>
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
  fab: {
    position: 'absolute',
    backgroundColor: '#355e3b',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(16),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80,
  },
  bottomSpacer: {
    height: 40,
  },
});
