import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * EMERGENCY: Clear all migration markers
 * Run this once to force migrations to run again
 */
export async function clearAllMigrationMarkers() {
  try {
    await AsyncStorage.multiRemove([
      'migration_v1_categories_to_db',
      'migration_v2_category_budgets',
      'migration_v3_additional_categories'
    ]);
    console.log('✅ All migration markers cleared');
  } catch (error) {
    console.error('❌ Failed to clear migration markers:', error);
  }
}
