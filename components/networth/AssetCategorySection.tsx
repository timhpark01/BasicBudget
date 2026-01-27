import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetWorthItem } from '@/lib/db/models/net-worth';
import { ActiveFieldType } from './types';
import ItemInputRow from './ItemInputRow';
import { formatCurrency } from '@/lib/utils/number-formatter';

interface AssetCategorySectionProps {
  title: string;
  items: NetWorthItem[];
  type: ActiveFieldType;
  onAdd: () => void;
  onUpdate: (id: string, field: 'name' | 'amount', value: string) => void;
  onDelete: (id: string) => void;
  onAmountPress: (id: string, type: ActiveFieldType, currentAmount: string) => void;
  showSubtotal?: boolean;
}

export default function AssetCategorySection({
  title,
  items,
  type,
  onAdd,
  onUpdate,
  onDelete,
  onAmountPress,
  showSubtotal = true,
}: AssetCategorySectionProps) {
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  return (
    <View style={[styles.subcategory, items.length === 0 && styles.emptySubcategory]}>
      <View style={styles.subcategoryHeader}>
        <Text style={styles.subcategoryTitle}>{title}</Text>
        <TouchableOpacity onPress={onAdd} style={styles.addButton}>
          <Ionicons name="add-circle" size={24} color="#355e3b" />
        </TouchableOpacity>
      </View>

      {items.map((item) => (
        <ItemInputRow
          key={item.id}
          item={item}
          type={type}
          onNameChange={onUpdate}
          onAmountPress={onAmountPress}
          onDelete={onDelete}
        />
      ))}

      {items.length > 0 && showSubtotal && (
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>{title} Assets</Text>
          <Text style={styles.subtotalValue}>
            {formatCurrency(subtotal)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
