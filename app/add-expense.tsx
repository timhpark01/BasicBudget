import { useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { getDatabase } from '@/lib/db/core/database';
import { createExpense } from '@/lib/db/models/expenses';
import { CATEGORIES } from '@/constants/categories';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Global flag to prevent duplicate execution across component remounts
let globalProcessingFlag = false;
let globalLastProcessedParams = '';

/**
 * This route handles deep links from iOS Shortcuts
 * URL format: basicbudget://add-expense?amount=X&note=Y
 */
export default function AddExpenseDeepLink() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Create unique key for these params
    const paramsKey = JSON.stringify(params);

    // Prevent duplicate execution using both ref and global flag
    if (hasProcessed.current || globalProcessingFlag || globalLastProcessedParams === paramsKey) {
      console.log('[add-expense] Already processed, skipping', {
        hasProcessed: hasProcessed.current,
        globalProcessingFlag,
        sameParams: globalLastProcessedParams === paramsKey
      });
      return;
    }

    async function handleShortcut() {
      try {
        // Set all flags immediately
        hasProcessed.current = true;
        globalProcessingFlag = true;
        globalLastProcessedParams = paramsKey;

        console.log('[add-expense] Processing expense with params:', params);

        const amount = params.amount as string;
        const rawNote = (params.note as string) || '';

        // Replace underscores with spaces in note
        const note = rawNote.replace(/_/g, ' ');

        // Validate amount
        if (!amount) {
          throw new Error('Amount is required');
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          throw new Error('Amount must be a positive number');
        }

        // Get database
        const db = await getDatabase();

        // Find Unlabeled category (ID: '6')
        const unlabeledCategory = CATEGORIES.find(c => c.id === '6');
        if (!unlabeledCategory) {
          throw new Error('Unlabeled category not found');
        }

        // Create expense directly
        console.log('[add-expense] Creating expense:', { amount, note, category: unlabeledCategory.name });
        await createExpense(db, {
          amount: amount,
          category: unlabeledCategory,
          date: new Date(),
          note: note
        });
        console.log('[add-expense] Expense created successfully');

        // Success feedback
        Toast.show({
          type: 'success',
          text1: 'Expense added',
          text2: 'Via iOS Shortcut',
          position: 'top',
          visibilityTime: 3000,
        });

        // Navigate back to home screen
        router.replace('/(tabs)');

        // Reset global flag after successful navigation
        setTimeout(() => {
          globalProcessingFlag = false;
        }, 1000);
      } catch (error) {
        console.error('[add-expense] Error:', error);
        // Error feedback
        const message = error instanceof Error ? error.message : 'Unknown error';
        Toast.show({
          type: 'error',
          text1: 'Failed to add expense',
          text2: message,
          position: 'top',
          visibilityTime: 4000,
        });

        // Navigate back to home screen even on error
        router.replace('/(tabs)');

        // Reset global flag after navigation
        setTimeout(() => {
          globalProcessingFlag = false;
        }, 1000);
      }
    }

    handleShortcut();
  }, []);

  // Show loading indicator briefly while processing
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#355e3b" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
