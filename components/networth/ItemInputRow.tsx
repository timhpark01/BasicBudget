import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetWorthItem } from '@/lib/db/models/net-worth';
import { ActiveFieldType } from './types';

interface ItemInputRowProps {
  item: NetWorthItem;
  type: ActiveFieldType;
  onNameChange: (id: string, field: 'name' | 'amount', value: string) => void;
  onAmountPress: (id: string, type: ActiveFieldType, currentAmount: string) => void;
  onDelete: (id: string) => void;
}

export default function ItemInputRow({
  item,
  type,
  onNameChange,
  onAmountPress,
  onDelete,
}: ItemInputRowProps) {
  return (
    <View style={styles.itemRow}>
      <TextInput
        style={styles.nameInput}
        value={item.name}
        onChangeText={(value) => onNameChange(item.id, 'name', value)}
        placeholder={type === 'liability' ? 'Liability name' : 'Asset name'}
        placeholderTextColor="#999"
      />
      <TouchableOpacity
        style={styles.amountInputContainer}
        onPress={() => onAmountPress(item.id, type, item.amount)}
      >
        <Text style={styles.dollarSign}>$</Text>
        <Text style={styles.amountInputText}>
          {item.amount || '0.00'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteButton}>
        <Ionicons name="remove-circle" size={24} color="#DC3545" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  deleteButton: {
    padding: 4,
  },
  dollarSign: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 4,
  },
  amountInputText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
});
