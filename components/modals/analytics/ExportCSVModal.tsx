import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense } from '@/types/database';
import { getAllExpenses } from '@/lib/db/models/expenses';
import { getDatabase } from '@/lib/db/core/database';
import { exportExpensesToCSV, exportNetWorthToCSV } from '@/lib/services/export-service';
import { NetWorthEntry } from '@/lib/db/models/net-worth';
import { getAllNetWorthEntries, calculateNetWorth, calculateTotalAssets, calculateTotalLiabilities } from '@/lib/db/models/net-worth';

export type ExportDataType = 'expenses' | 'networth';

interface ExportCSVModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ExportCSVModal({ visible, onClose }: ExportCSVModalProps) {
  const [exportType, setExportType] = useState<ExportDataType>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [netWorthEntries, setNetWorthEntries] = useState<NetWorthEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (exportType === 'expenses') {
        loadExpenses();
      } else {
        loadNetWorthEntries();
      }
    }
  }, [visible, exportType]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const allExpenses = await getAllExpenses(db);
      setExpenses(allExpenses);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      Alert.alert('Error', 'Failed to load expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadNetWorthEntries = async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const entries = await getAllNetWorthEntries(db);
      setNetWorthEntries(entries);
    } catch (error) {
      console.error('Failed to load net worth entries:', error);
      Alert.alert('Error', 'Failed to load net worth entries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      if (exportType === 'expenses') {
        await exportExpensesToCSV(expenses);
        Alert.alert(
          'Success',
          'Your expenses have been exported successfully!',
          [
            {
              text: 'OK',
              onPress: () => onClose(),
            },
          ]
        );
      } else {
        await exportNetWorthToCSV(netWorthEntries);
        Alert.alert(
          'Success',
          'Your net worth history has been exported successfully!',
          [
            {
              text: 'OK',
              onPress: () => onClose(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'An error occurred while exporting. Please try again.'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Export Data</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeSelectorButton,
              exportType === 'expenses' && styles.typeSelectorButtonActive
            ]}
            onPress={() => setExportType('expenses')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="receipt-outline"
              size={20}
              color={exportType === 'expenses' ? '#fff' : '#355e3b'}
            />
            <Text style={[
              styles.typeSelectorText,
              exportType === 'expenses' && styles.typeSelectorTextActive
            ]}>
              Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeSelectorButton,
              exportType === 'networth' && styles.typeSelectorButtonActive
            ]}
            onPress={() => setExportType('networth')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="trending-up-outline"
              size={20}
              color={exportType === 'networth' ? '#fff' : '#355e3b'}
            />
            <Text style={[
              styles.typeSelectorText,
              exportType === 'networth' && styles.typeSelectorTextActive
            ]}>
              Net Worth
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#355e3b" />
              <Text style={styles.loadingText}>
                Loading {exportType === 'expenses' ? 'expenses' : 'net worth entries'}...
              </Text>
            </View>
          ) : (exportType === 'expenses' ? expenses.length === 0 : netWorthEntries.length === 0) ? (
            // Empty State
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No Data to Export</Text>
              <Text style={styles.emptyStateSubtext}>
                {exportType === 'expenses'
                  ? 'Add some expenses first to export your data'
                  : 'Add net worth entries first to export your data'
                }
              </Text>
            </View>
          ) : (
            <>
              {/* Summary Card */}
              <View style={styles.summaryCard}>
                <Ionicons name="checkmark-circle" size={48} color="#fff" />
                <Text style={styles.summaryLabel}>Ready to Export</Text>
                <Text style={styles.summaryAmount}>
                  {exportType === 'expenses'
                    ? `${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}`
                    : `${netWorthEntries.length} entr${netWorthEntries.length !== 1 ? 'ies' : 'y'}`
                  }
                </Text>
                <Text style={styles.summarySubtext}>
                  {exportType === 'expenses'
                    ? 'All your expense data will be exported to CSV format'
                    : 'All your net worth history will be exported to CSV format'
                  }
                </Text>
              </View>

              {/* Info Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Export Details</Text>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.infoLabel}>Format:</Text>
                    <Text style={styles.infoValue}>CSV (Comma-Separated Values)</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="list-outline" size={20} color="#666" />
                    <Text style={styles.infoLabel}>Columns:</Text>
                    <Text style={styles.infoValue}>
                      {exportType === 'expenses'
                        ? 'Date, Category, Description, Amount'
                        : 'Date, Net Worth, Total Assets, Individual Assets, Total Liabilities, Individual Liabilities'
                      }
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="document-outline" size={20} color="#666" />
                    <Text style={styles.infoLabel}>
                      {exportType === 'expenses' ? 'Transactions:' : 'Entries:'}
                    </Text>
                    <Text style={styles.infoValue}>
                      {exportType === 'expenses' ? expenses.length : netWorthEntries.length} total
                    </Text>
                  </View>
                </View>
              </View>

              {/* Preview Section */}
              {(exportType === 'expenses' ? expenses.length > 0 : netWorthEntries.length > 0) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Preview</Text>
                  <Text style={styles.sectionSubtitle}>
                    {exportType === 'expenses' ? 'First 3 transactions:' : 'First 3 entries:'}
                  </Text>

                  {exportType === 'expenses' ? (
                    expenses.slice(0, 3).map((expense) => (
                      <View key={expense.id} style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                          <View style={[styles.categoryIcon, { backgroundColor: expense.category.color + '20' }]}>
                            <Ionicons name={expense.category.icon} size={20} color={expense.category.color} />
                          </View>
                          <View style={styles.previewContent}>
                            <Text style={styles.previewCategory}>{expense.category.name}</Text>
                            <Text style={styles.previewDate}>
                              {expense.date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                          <Text style={styles.previewAmount}>${parseFloat(expense.amount).toFixed(2)}</Text>
                        </View>
                        {expense.note && <Text style={styles.previewNote}>{expense.note}</Text>}
                      </View>
                    ))
                  ) : (
                    netWorthEntries.slice(0, 3).map((entry) => (
                      <View key={entry.id} style={styles.previewCard}>
                        <View style={styles.previewHeader}>
                          <View style={[styles.categoryIcon, { backgroundColor: '#355e3b20' }]}>
                            <Ionicons name="trending-up" size={20} color="#355e3b" />
                          </View>
                          <View style={styles.previewContent}>
                            <Text style={styles.previewCategory}>
                              {new Date(entry.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                            <Text style={styles.previewDate}>
                              Net Worth: ${calculateNetWorth(entry).toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.previewAmountColumn}>
                            <Text style={styles.previewAssets}>
                              A: ${calculateTotalAssets(entry).toFixed(2)}
                            </Text>
                            <Text style={styles.previewLiabilities}>
                              L: ${calculateTotalLiabilities(entry).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        {entry.notes && <Text style={styles.previewNote}>{entry.notes}</Text>}
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* Export Button */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
                  onPress={handleExport}
                  disabled={exporting}
                  activeOpacity={0.7}
                >
                  {exporting ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" style={styles.buttonLoader} />
                      <Text style={styles.exportButtonText}>Exporting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={24} color="#fff" />
                      <Text style={styles.exportButtonText}>Export to CSV</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
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
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  typeSelector: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  typeSelectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  typeSelectorButtonActive: {
    backgroundColor: '#355e3b',
  },
  typeSelectorText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#355e3b',
  },
  typeSelectorTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  summaryCard: {
    backgroundColor: '#355e3b',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  previewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    flex: 1,
  },
  previewCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  previewDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  previewAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  previewNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginLeft: 52,
  },
  previewAmountColumn: {
    alignItems: 'flex-end',
  },
  previewAssets: {
    fontSize: 14,
    fontWeight: '600',
    color: '#355e3b',
  },
  previewLiabilities: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC3545',
    marginTop: 2,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: '#355e3b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  buttonLoader: {
    marginRight: 4,
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
  },
  bottomSpacer: {
    height: 40,
  },
});
