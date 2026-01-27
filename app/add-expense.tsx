import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { addExpenseFromURL } from '@/lib/utils/url-handler';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * This route handles deep links from iOS Shortcuts
 * URL format: basicbudget://add-expense?amount=X&note=Y
 */
export default function AddExpenseDeepLink() {
  const params = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    async function handleShortcut() {
      try {
        const amount = params.amount as string;
        const note = (params.note as string) || '';

        if (!amount) {
          throw new Error('Amount is required');
        }

        // Build the URL for the handler
        const url = `basicbudget://add-expense?amount=${amount}${note ? `&note=${encodeURIComponent(note)}` : ''}`;

        // Process the expense
        await addExpenseFromURL(url);

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
      } catch (error) {
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
      }
    }

    handleShortcut();
  }, [params, router]);

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
