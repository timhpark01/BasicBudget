import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Expense } from '@/types/database';

interface ExpenseDetailModalProps {
  visible: boolean;
  expense: Expense | null;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  onDuplicate: (expense: Expense) => void;
}

export default function ExpenseDetailModal({
  visible,
  expense,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}: ExpenseDetailModalProps) {
  if (!expense) {
    return null;
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEdit(expense);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(expense.id);
    onClose();
  };

  const handleDuplicate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDuplicate(expense);
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
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Details</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Category Icon */}
          <View
            style={[
              styles.categoryIconContainer,
              { backgroundColor: expense.category.color + '20' },
            ]}
          >
            <Ionicons name={expense.category.icon} size={48} color={expense.category.color} />
          </View>

          {/* Category Name */}
          <Text style={styles.categoryName}>{expense.category.name}</Text>

          {/* Amount */}
          <Text style={styles.amount}>${parseFloat(expense.amount).toFixed(2)}</Text>

          {/* Date */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(expense.date)}</Text>
          </View>

          {/* Note */}
          {expense.note && (
            <View style={styles.noteContainer}>
              <View style={styles.noteHeader}>
                <Ionicons name="document-text-outline" size={20} color="#666" />
                <Text style={styles.infoLabel}>Note</Text>
              </View>
              <Text style={styles.noteText}>{expense.note}</Text>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.duplicateButton]}
            onPress={handleDuplicate}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={20} color="#666" />
            <Text style={[styles.actionButtonText, styles.duplicateButtonText]}>Duplicate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  noteContainer: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    paddingLeft: 32,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#355e3b',
  },
  duplicateButton: {
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  duplicateButtonText: {
    color: '#666',
  },
});
