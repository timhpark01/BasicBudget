import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetWorthItem } from '@/lib/db/models/net-worth';
import { ActiveField } from './types';
import AssetCategorySection from './AssetCategorySection';
import ItemInputRow from './ItemInputRow';
import CalculatorKeypad from '@/components/shared/CalculatorKeypad';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface NetWorthEntryFormProps {
  // Date display
  selectedDate: Date;
  onDatePress: () => void;
  showPrepopulationNote: boolean;
  prepopulationDate?: string;

  // Assets
  liquidAssets: NetWorthItem[];
  illiquidAssets: NetWorthItem[];
  retirementAssets: NetWorthItem[];
  onAddLiquidAsset: () => void;
  onUpdateLiquidAsset: (id: string, field: 'name' | 'amount', value: string) => void;
  onRemoveLiquidAsset: (id: string) => void;
  onAddIlliquidAsset: () => void;
  onUpdateIlliquidAsset: (id: string, field: 'name' | 'amount', value: string) => void;
  onRemoveIlliquidAsset: (id: string) => void;
  onAddRetirementAsset: () => void;
  onUpdateRetirementAsset: (id: string, field: 'name' | 'amount', value: string) => void;
  onRemoveRetirementAsset: (id: string) => void;

  // Liabilities
  liabilities: NetWorthItem[];
  onAddLiability: () => void;
  onUpdateLiability: (id: string, field: 'name' | 'amount', value: string) => void;
  onRemoveLiability: (id: string) => void;

  // Notes
  notes: string;
  onNotesChange: (value: string) => void;

  // Calculator
  activeField: ActiveField | null;
  calculatorAmount: string;
  onAmountFieldPress: (id: string, type: any, currentAmount: string) => void;
  onCalculatorNumberPress: (num: string) => void;
  onCalculatorDecimalPress: () => void;
  onCalculatorBackspace: () => void;
  onCalculatorClear: () => void;
  onCalculatorDone: () => void;

  // Totals
  formLiquidAssets: number;
  formIlliquidAssets: number;
  formRetirementAssets: number;
  formTotalAssets: number;
  formLiabilities: number;
  formNetWorth: number;

  // Actions
  onSave: () => void;
}

export default function NetWorthEntryForm({
  selectedDate,
  onDatePress,
  showPrepopulationNote,
  prepopulationDate,
  liquidAssets,
  illiquidAssets,
  retirementAssets,
  onAddLiquidAsset,
  onUpdateLiquidAsset,
  onRemoveLiquidAsset,
  onAddIlliquidAsset,
  onUpdateIlliquidAsset,
  onRemoveIlliquidAsset,
  onAddRetirementAsset,
  onUpdateRetirementAsset,
  onRemoveRetirementAsset,
  liabilities,
  onAddLiability,
  onUpdateLiability,
  onRemoveLiability,
  notes,
  onNotesChange,
  activeField,
  calculatorAmount,
  onAmountFieldPress,
  onCalculatorNumberPress,
  onCalculatorDecimalPress,
  onCalculatorBackspace,
  onCalculatorClear,
  onCalculatorDone,
  formLiquidAssets,
  formIlliquidAssets,
  formRetirementAssets,
  formTotalAssets,
  formLiabilities,
  formNetWorth,
  onSave,
}: NetWorthEntryFormProps) {
  return (
    <>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.entryContainer}>
          {/* Date Selector */}
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={styles.dateDisplayButton}
              onPress={onDatePress}
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
          {showPrepopulationNote && prepopulationDate && (
            <View style={styles.prepopulationNote}>
              <Ionicons name="information-circle" size={16} color="#355e3b" />
              <Text style={styles.prepopulationText}>
                Prepopulated from {prepopulationDate}
              </Text>
            </View>
          )}

          {/* Assets Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assets</Text>

            {/* Liquid Assets Subcategory */}
            <AssetCategorySection
              title="Liquid"
              items={liquidAssets}
              type="liquid"
              color="#22C55E"
              onAdd={onAddLiquidAsset}
              onUpdate={onUpdateLiquidAsset}
              onDelete={onRemoveLiquidAsset}
              onAmountPress={onAmountFieldPress}
            />

            {/* Illiquid Assets Subcategory */}
            <AssetCategorySection
              title="Illiquid"
              items={illiquidAssets}
              type="illiquid"
              color="#EAB308"
              onAdd={onAddIlliquidAsset}
              onUpdate={onUpdateIlliquidAsset}
              onDelete={onRemoveIlliquidAsset}
              onAmountPress={onAmountFieldPress}
            />

            {/* Retirement Assets Subcategory */}
            <AssetCategorySection
              title="Retirement"
              items={retirementAssets}
              type="retirement"
              color="#3B82F6"
              onAdd={onAddRetirementAsset}
              onUpdate={onUpdateRetirementAsset}
              onDelete={onRemoveRetirementAsset}
              onAmountPress={onAmountFieldPress}
            />

            {/* Total Assets */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Assets</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(formTotalAssets)}
              </Text>
            </View>
          </View>

          {/* Liabilities Section */}
          <View style={[styles.section, liabilities.length === 0 && styles.emptySection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Liabilities</Text>
              <TouchableOpacity onPress={onAddLiability} style={styles.addButton}>
                <Ionicons name="add-circle" size={28} color="#355e3b" />
              </TouchableOpacity>
            </View>

            {liabilities.map((liability) => (
              <ItemInputRow
                key={liability.id}
                item={liability}
                type="liability"
                onNameChange={onUpdateLiability}
                onAmountPress={onAmountFieldPress}
                onDelete={onRemoveLiability}
              />
            ))}

            {liabilities.length > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Liabilities</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(formLiabilities)}
                </Text>
              </View>
            )}
          </View>

          {/* Net Worth */}
          <View style={styles.netWorthCard}>
            <Text style={styles.netWorthLabel}>Net Worth</Text>
            <Text style={[styles.netWorthValue, formNetWorth < 0 && styles.negativeValue]}>
              {formatCurrency(formNetWorth)}
            </Text>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={onNotesChange}
              placeholder="Add any notes about this month..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={onSave}>
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Calculator Keypad Modal */}
      <Modal
        visible={activeField !== null}
        transparent
        animationType="slide"
        onRequestClose={onCalculatorDone}
      >
        <View style={styles.calculatorOverlay}>
          <TouchableOpacity
            style={styles.calculatorBackdrop}
            onPress={onCalculatorDone}
            activeOpacity={1}
          />
          <View style={styles.calculatorContainer}>
            <View style={styles.calculatorHeader}>
              <Text style={styles.calculatorTitle}>Enter Amount</Text>
              <TouchableOpacity onPress={onCalculatorDone}>
                <Ionicons name="checkmark-circle" size={32} color="#355e3b" />
              </TouchableOpacity>
            </View>
            <CalculatorKeypad
              amount={calculatorAmount}
              onNumberPress={onCalculatorNumberPress}
              onDecimalPress={onCalculatorDecimalPress}
              onBackspace={onCalculatorBackspace}
              onClear={onCalculatorClear}
            />
            <View style={styles.calculatorBottomSpacer} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  entryContainer: {
    padding: 16,
    paddingBottom: 100,
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
  addButton: {
    padding: 4,
  },
  emptySection: {
    paddingBottom: 8,
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
  negativeValue: {
    color: '#DC3545',
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
  buttonContainer: {
    marginTop: 8,
    marginBottom: 16,
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
  calculatorOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  calculatorBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  calculatorContainer: {
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
    height: 20,
  },
});
