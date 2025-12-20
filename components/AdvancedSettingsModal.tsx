import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSettings, setSetting, AppSettings } from '@/lib/settings';
import { useSettings } from '@/contexts/SettingsContext';

interface AdvancedSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdvancedSettingsModal({
  visible,
  onClose,
}: AdvancedSettingsModalProps) {
  const { reloadSettings } = useSettings();
  const [settings, setSettings] = useState<AppSettings>({
    netWorthEnabled: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNetWorth = async (value: boolean) => {
    try {
      // Update local state immediately
      setSettings((prev) => ({ ...prev, netWorthEnabled: value }));

      // Save to storage
      await setSetting('netWorthEnabled', value);

      // Reload settings in context to update tabs immediately
      await reloadSettings();

      // Show confirmation
      if (value) {
        Alert.alert(
          'Net Worth Enabled',
          'The Net Worth tab is now available. You can track your assets and liabilities over time.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to save setting:', error);
      // Revert on error
      setSettings((prev) => ({ ...prev, netWorthEnabled: !value }));
      Alert.alert('Error', 'Failed to save setting. Please try again.');
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
          <Text style={styles.headerTitle}>Advanced Settings</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Features Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <Text style={styles.sectionDescription}>
              Enable or disable optional features
            </Text>

            {/* Net Worth Toggle */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Ionicons name="trending-up" size={24} color="#355e3b" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Net Worth Tracking</Text>
                  <Text style={styles.settingDescription}>
                    Track your assets, liabilities, and net worth over time
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.netWorthEnabled}
                onValueChange={handleToggleNetWorth}
                trackColor={{ false: '#e0e0e0', true: '#355e3b' }}
                thumbColor="#fff"
                disabled={loading}
              />
            </View>
          </View>

          {/* Info Section */}
          {settings.netWorthEnabled && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#355e3b" />
              <Text style={styles.infoText}>
                A new "Net Worth" tab will appear. You can enter your monthly balance sheet
                including assets (savings, investments, retirement) and liabilities (debt) to
                track your financial health over time.
              </Text>
            </View>
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
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e3f2ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2ed',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#355e3b',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
