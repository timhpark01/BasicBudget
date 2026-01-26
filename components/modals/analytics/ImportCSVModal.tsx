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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Category } from '@/types/database';
import { ParsedTransaction, InvalidRow, ParseResult } from '@/lib/utils/csv-parser';
import {
  readAndParseCSV,
  resolveCategoryMappings,
  importTransactions,
  CategoryMapping,
} from '@/lib/services/import-service';
import { detectDuplicates } from '@/lib/utils/duplicate-detector';
import { getDatabase } from '@/lib/db/core/database';
import { getCustomCategories } from '@/lib/db/models/categories';
import { CATEGORIES } from '@/constants/categories';
import { Picker } from '@react-native-picker/picker';
import ColorPicker from '@/components/shared/ColorPicker';
import CategoryIconPicker from '@/components/shared/CategoryIconPicker';

type Stage = 'select' | 'preview' | 'importing';
type PreviewTab = 'valid' | 'invalid' | 'duplicates';

interface ImportCSVModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ImportCSVModal({ visible, onClose }: ImportCSVModalProps) {
  // Stage management
  const [stage, setStage] = useState<Stage>('select');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  // Parsed data
  const [validTransactions, setValidTransactions] = useState<ParsedTransaction[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([]);
  const [duplicates, setDuplicates] = useState<ParsedTransaction[]>([]);
  const [uniqueTransactions, setUniqueTransactions] = useState<ParsedTransaction[]>([]);

  // Category mapping
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [unmappedCategories, setUnmappedCategories] = useState<string[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<Map<string, CategoryMapping>>(
    new Map()
  );

  // Preview controls
  const [activeTab, setActiveTab] = useState<PreviewTab>('valid');
  const [showAllPreview, setShowAllPreview] = useState(false);

  // Import progress
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStage('select');
      setFileName('');
      setValidTransactions([]);
      setInvalidRows([]);
      setDuplicates([]);
      setUniqueTransactions([]);
      setUnmappedCategories([]);
      setCategoryMappings(new Map());
      setActiveTab('valid');
      setShowAllPreview(false);
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const db = await getDatabase();
      const customCategories = await getCustomCategories(db);
      setAllCategories([...CATEGORIES, ...customCategories]);
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    }
  };

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setFileName(file.name);
      setLoading(true);

      // Parse CSV file
      const parseResult = await readAndParseCSV(file.uri);

      setValidTransactions(parseResult.valid);
      setInvalidRows(parseResult.invalid);

      // Match categories
      const matched = matchCategories(parseResult.unmappedCategories);
      setUnmappedCategories(matched.unmapped);

      // Initialize category mappings for matched categories
      const initialMappings = new Map<string, CategoryMapping>();
      matched.mapped.forEach((category, csvName) => {
        initialMappings.set(csvName, {
          csvName,
          action: 'map',
          targetCategory: category,
        });
      });
      setCategoryMappings(initialMappings);

      // Detect duplicates (only for transactions with mapped categories)
      const db = await getDatabase();
      const mappingsForDuplicateCheck = new Map<string, Category>();
      initialMappings.forEach((mapping, csvName) => {
        if (mapping.targetCategory) {
          mappingsForDuplicateCheck.set(csvName, mapping.targetCategory);
        }
      });

      const transactionsWithMappedCategories = parseResult.valid.filter((t) =>
        mappingsForDuplicateCheck.has(t.categoryName)
      );

      if (transactionsWithMappedCategories.length > 0) {
        const { duplicates: dups, unique } = await detectDuplicates(
          transactionsWithMappedCategories,
          mappingsForDuplicateCheck,
          db
        );
        setDuplicates(dups);
        setUniqueTransactions(unique);
      } else {
        setDuplicates([]);
        setUniqueTransactions([]);
      }

      setStage('preview');
    } catch (error) {
      console.error('File selection error:', error);
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Failed to read CSV file. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const matchCategories = (
    csvCategories: string[]
  ): { mapped: Map<string, Category>; unmapped: string[] } => {
    const mapped = new Map<string, Category>();
    const unmapped: string[] = [];

    // Create lookup maps (exact and case-insensitive)
    const exactMatchMap = new Map<string, Category>();
    const normalizedMatchMap = new Map<string, Category>();

    allCategories.forEach((cat) => {
      exactMatchMap.set(cat.name, cat);
      normalizedMatchMap.set(cat.name.toLowerCase().trim(), cat);
    });

    csvCategories.forEach((csvCategoryName) => {
      // Try exact match
      let category = exactMatchMap.get(csvCategoryName);

      // Try case-insensitive match
      if (!category) {
        category = normalizedMatchMap.get(csvCategoryName.toLowerCase().trim());
      }

      if (category) {
        mapped.set(csvCategoryName, category);
      } else {
        unmapped.push(csvCategoryName);
      }
    });

    return { mapped, unmapped };
  };

  const handleCategoryMappingChange = (csvName: string, selectedValue: string) => {
    const mappings = new Map(categoryMappings);

    if (selectedValue === 'create_new') {
      // Create new category with default values
      mappings.set(csvName, {
        csvName,
        action: 'create',
        newCategory: {
          name: csvName,
          icon: 'help-circle-outline',
          color: getRandomColor(),
        },
      });
    } else {
      // Map to existing category
      const category = allCategories.find((c) => c.id === selectedValue);
      if (category) {
        mappings.set(csvName, {
          csvName,
          action: 'map',
          targetCategory: category,
        });
      }
    }

    setCategoryMappings(mappings);
  };

  const updateNewCategoryName = (csvName: string, newName: string) => {
    const mappings = new Map(categoryMappings);
    const mapping = mappings.get(csvName);
    if (mapping && mapping.action === 'create' && mapping.newCategory) {
      mappings.set(csvName, {
        ...mapping,
        newCategory: {
          ...mapping.newCategory,
          name: newName,
        },
      });
      setCategoryMappings(mappings);
    }
  };

  const updateNewCategoryIcon = (csvName: string, icon: string) => {
    const mappings = new Map(categoryMappings);
    const mapping = mappings.get(csvName);
    if (mapping && mapping.action === 'create' && mapping.newCategory) {
      mappings.set(csvName, {
        ...mapping,
        newCategory: {
          ...mapping.newCategory,
          icon,
        },
      });
      setCategoryMappings(mappings);
    }
  };

  const updateNewCategoryColor = (csvName: string, color: string) => {
    const mappings = new Map(categoryMappings);
    const mapping = mappings.get(csvName);
    if (mapping && mapping.action === 'create' && mapping.newCategory) {
      mappings.set(csvName, {
        ...mapping,
        newCategory: {
          ...mapping.newCategory,
          color,
        },
      });
      setCategoryMappings(mappings);
    }
  };

  const getRandomColor = (): string => {
    const colors = ['#FF8C42', '#2ECC71', '#4ECDC4', '#48DBFB', '#9B59B6', '#E74C3C', '#F39C12'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const allCategoriesMapped = (): boolean => {
    return unmappedCategories.every((csvName) => categoryMappings.has(csvName));
  };

  const handleImport = async () => {
    if (!allCategoriesMapped()) {
      Alert.alert('Missing Mappings', 'Please map all categories before importing.');
      return;
    }

    try {
      setImporting(true);
      setStage('importing');

      const db = await getDatabase();

      // Resolve category mappings (create new categories if needed)
      const mappingsArray = Array.from(categoryMappings.values());
      const resolvedMappings = await resolveCategoryMappings(mappingsArray, db);

      // Re-detect duplicates with all resolved mappings
      const { unique } = await detectDuplicates(validTransactions, resolvedMappings, db);
      setUniqueTransactions(unique);

      // Import transactions
      const result = await importTransactions(unique, resolvedMappings, db, (current, total) => {
        setImportProgress({ current, total });
      });

      setImporting(false);

      if (result.failed === 0) {
        // Complete success
        Alert.alert('Success', `Successfully imported ${result.imported} transactions!`, [
          { text: 'OK', onPress: onClose },
        ]);
      } else {
        // Partial failure
        const errorSummary =
          result.errors.length > 3
            ? result.errors.slice(0, 3).map((e) => `Row ${e.row}: ${e.message}`).join('\n') +
              `\n... and ${result.errors.length - 3} more`
            : result.errors.map((e) => `Row ${e.row}: ${e.message}`).join('\n');

        Alert.alert(
          'Import Completed with Errors',
          `Imported ${result.imported} of ${result.total} transactions.\n\n${result.failed} failed:\n${errorSummary}`,
          [{ text: 'OK', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('Import error:', error);
      setImporting(false);
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'An error occurred during import.'
      );
    }
  };

  const renderFileSelection = () => (
    <View style={styles.centerContent}>
      <Ionicons name="document-text-outline" size={80} color="#ccc" />
      <Text style={styles.selectionTitle}>Import CSV File</Text>
      <Text style={styles.selectionSubtext}>
        Choose a CSV file containing your expense transactions
      </Text>

      <TouchableOpacity
        style={styles.selectButton}
        onPress={handleSelectFile}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
            <Text style={styles.selectButtonText}>Choose File</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Expected Format</Text>
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Format:</Text> CSV (Comma-Separated Values){'\n'}
          <Text style={styles.infoBold}>Required Columns:</Text> Date, Category, Description, Amount
          {'\n'}
          <Text style={styles.infoBold}>Example:</Text>
        </Text>
        <View style={styles.exampleBox}>
          <Text style={styles.exampleText}>2026-01-15,Groceries,Weekly shopping,125.50</Text>
        </View>
      </View>
    </View>
  );

  const renderPreview = () => {
    const transactionsToImport =
      uniqueTransactions.length > 0 ? uniqueTransactions : validTransactions;
    const displayTransactions = showAllPreview
      ? transactionsToImport
      : transactionsToImport.slice(0, 20);

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Review Import</Text>
          <Text style={styles.fileName}>{fileName}</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{validTransactions.length}</Text>
              <Text style={styles.statLabel}>Valid</Text>
            </View>
            {invalidRows.length > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.warningText]}>{invalidRows.length}</Text>
                <Text style={styles.statLabel}>Invalid</Text>
              </View>
            )}
            {duplicates.length > 0 && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.grayText]}>{duplicates.length}</Text>
                <Text style={styles.statLabel}>Duplicates</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabs */}
        {(invalidRows.length > 0 || duplicates.length > 0) && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'valid' && styles.tabActive]}
              onPress={() => setActiveTab('valid')}
            >
              <Text style={[styles.tabText, activeTab === 'valid' && styles.tabTextActive]}>
                Valid ({transactionsToImport.length})
              </Text>
            </TouchableOpacity>
            {invalidRows.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'invalid' && styles.tabActive]}
                onPress={() => setActiveTab('invalid')}
              >
                <Text style={[styles.tabText, activeTab === 'invalid' && styles.tabTextActive]}>
                  Invalid ({invalidRows.length})
                </Text>
              </TouchableOpacity>
            )}
            {duplicates.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'duplicates' && styles.tabActive]}
                onPress={() => setActiveTab('duplicates')}
              >
                <Text style={[styles.tabText, activeTab === 'duplicates' && styles.tabTextActive]}>
                  Duplicates ({duplicates.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Category Mapping Section */}
        {unmappedCategories.length > 0 && activeTab === 'valid' && (
          <View style={styles.mappingSection}>
            <Text style={styles.mappingSectionTitle}>Category Mapping</Text>
            <Text style={styles.mappingSectionSubtext}>
              Map unknown categories to existing ones or create new categories
            </Text>
            {unmappedCategories.map((csvName) => {
              const mapping = categoryMappings.get(csvName);
              const isCreatingNew = mapping?.action === 'create';

              return (
                <View key={csvName} style={styles.mappingCard}>
                  <Text style={styles.mappingLabel}>
                    CSV Category: <Text style={styles.mappingCsvName}>"{csvName}"</Text>
                  </Text>

                  <Picker
                    selectedValue={mapping?.targetCategory?.id || 'create_new'}
                    onValueChange={(value: string) => handleCategoryMappingChange(csvName, value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Create New Category" value="create_new" />
                    <Picker.Item label="--- Existing Categories ---" value="" enabled={false} />
                    {allCategories.map((cat) => (
                      <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
                    ))}
                  </Picker>

                  {isCreatingNew && mapping.newCategory && (
                    <View style={styles.newCategoryForm}>
                      <Text style={styles.newCategoryTitle}>Customize New Category</Text>

                      {/* Name Input */}
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Name</Text>
                        <TextInput
                          style={styles.textInput}
                          value={mapping.newCategory.name}
                          onChangeText={(text) => updateNewCategoryName(csvName, text)}
                          placeholder="Category name"
                          maxLength={20}
                        />
                      </View>

                      {/* Icon Picker */}
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Icon</Text>
                        <CategoryIconPicker
                          selectedIcon={mapping.newCategory.icon}
                          onSelectIcon={(icon) => updateNewCategoryIcon(csvName, icon)}
                        />
                      </View>

                      {/* Color Picker */}
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Color</Text>
                        <ColorPicker
                          selectedColor={mapping.newCategory.color}
                          onSelectColor={(color) => updateNewCategoryColor(csvName, color)}
                        />
                      </View>

                      {/* Preview */}
                      <View style={styles.categoryPreview}>
                        <View
                          style={[
                            styles.previewIcon,
                            { backgroundColor: mapping.newCategory.color + '20' },
                          ]}
                        >
                          <Ionicons
                            name={mapping.newCategory.icon as any}
                            size={24}
                            color={mapping.newCategory.color}
                          />
                        </View>
                        <Text style={styles.previewName}>{mapping.newCategory.name}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Preview List */}
        {activeTab === 'valid' && displayTransactions.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Transaction Preview</Text>
            {displayTransactions.map((transaction, index) => {
              const mapping = categoryMappings.get(transaction.categoryName);
              const category = mapping?.targetCategory || {
                name: transaction.categoryName,
                icon: 'help-circle-outline' as any,
                color: '#999',
              };

              return (
                <View key={index} style={styles.transactionCard}>
                  <View
                    style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}
                  >
                    <Ionicons name={category.icon} size={20} color={category.color} />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionCategory}>{category.name}</Text>
                    <Text style={styles.transactionDate}>
                      {transaction.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    {transaction.description && (
                      <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    )}
                  </View>
                  <Text style={styles.transactionAmount}>
                    ${parseFloat(transaction.amount).toFixed(2)}
                  </Text>
                </View>
              );
            })}
            {!showAllPreview && transactionsToImport.length > 20 && (
              <TouchableOpacity
                style={styles.showAllButton}
                onPress={() => setShowAllPreview(true)}
              >
                <Text style={styles.showAllText}>
                  Show All ({transactionsToImport.length} transactions)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Invalid Rows Tab */}
        {activeTab === 'invalid' && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Invalid Rows</Text>
            {invalidRows.map((row) => (
              <View key={row.row} style={styles.invalidCard}>
                <Text style={styles.invalidRowNumber}>Row {row.row}</Text>
                {row.errors.map((error, index) => (
                  <Text key={index} style={styles.invalidError}>
                    • {error}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Duplicates Tab */}
        {activeTab === 'duplicates' && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Duplicate Transactions</Text>
            <Text style={styles.duplicateSubtext}>
              These transactions already exist in your database and will be skipped.
            </Text>
            {duplicates.map((transaction, index) => {
              const mapping = categoryMappings.get(transaction.categoryName);
              const category = mapping?.targetCategory || {
                name: transaction.categoryName,
                icon: 'help-circle-outline' as any,
                color: '#999',
              };

              return (
                <View key={index} style={[styles.transactionCard, styles.duplicateCard]}>
                  <View
                    style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}
                  >
                    <Ionicons name={category.icon} size={20} color={category.color} />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionCategory}>{category.name}</Text>
                    <Text style={styles.transactionDate}>
                      {transaction.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.transactionAmount}>
                    ${parseFloat(transaction.amount).toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const renderImporting = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color="#355e3b" />
      <Text style={styles.importingText}>Importing Transactions...</Text>
      <Text style={styles.importingProgress}>
        {importProgress.current} of {importProgress.total}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={importing}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import CSV</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Content based on stage */}
        {stage === 'select' && renderFileSelection()}
        {stage === 'preview' && renderPreview()}
        {stage === 'importing' && renderImporting()}

        {/* Import Button (shown only in preview stage) */}
        {stage === 'preview' && (
          <View style={styles.importButtonContainer}>
            <TouchableOpacity
              style={[styles.importButton, !allCategoriesMapped() && styles.importButtonDisabled]}
              onPress={handleImport}
              disabled={!allCategoriesMapped() || importing}
              activeOpacity={0.7}
            >
              <Text style={styles.importButtonText}>
                Import {uniqueTransactions.length || validTransactions.length} Transactions
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  selectionSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  selectButton: {
    backgroundColor: '#355e3b',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  infoBold: {
    fontWeight: '600',
    color: '#333',
  },
  exampleBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  exampleText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#355e3b',
    padding: 24,
    margin: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  warningText: {
    color: '#FFA500',
  },
  grayText: {
    color: '#ccc',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#355e3b',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  tabTextActive: {
    color: '#355e3b',
    fontWeight: '600',
  },
  mappingSection: {
    padding: 16,
    backgroundColor: '#fff5e6',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mappingSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  mappingSectionSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  mappingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mappingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  mappingCsvName: {
    fontWeight: '600',
    color: '#333',
  },
  picker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  newCategoryForm: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  newCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  categoryPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  previewSection: {
    padding: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  duplicateSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  duplicateCard: {
    opacity: 0.6,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  showAllButton: {
    padding: 12,
    alignItems: 'center',
  },
  showAllText: {
    fontSize: 16,
    color: '#355e3b',
    fontWeight: '600',
  },
  invalidCard: {
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffdddd',
  },
  invalidRowNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC3545',
    marginBottom: 8,
  },
  invalidError: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginTop: 4,
  },
  importingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 24,
  },
  importingProgress: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  importButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  importButton: {
    backgroundColor: '#355e3b',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonDisabled: {
    backgroundColor: '#ccc',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
