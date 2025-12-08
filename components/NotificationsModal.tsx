import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsModal({
  visible,
  onClose,
}: NotificationsModalProps) {
  const { preferences, togglePreference } = useNotificationPreferences();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.intro}>
            Manage your notification preferences. Note: Actual notifications are
            not yet implemented.
          </Text>

          <View style={styles.settingCard}>
            <View style={styles.settingIcon}>
              <Ionicons name="warning" size={24} color="#355e3b" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Budget Warnings</Text>
              <Text style={styles.settingDescription}>
                Get notified when you're approaching or exceeding your monthly
                budget
              </Text>
            </View>
            <Switch
              value={preferences.budgetWarnings}
              onValueChange={() => togglePreference('budgetWarnings')}
              trackColor={{ false: '#e0e0e0', true: '#8cb89d' }}
              thumbColor={preferences.budgetWarnings ? '#355e3b' : '#f4f4f4'}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingIcon}>
              <Ionicons name="time" size={24} color="#355e3b" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Daily Reminder</Text>
              <Text style={styles.settingDescription}>
                Receive a daily reminder to log your expenses
              </Text>
            </View>
            <Switch
              value={preferences.dailyReminder}
              onValueChange={() => togglePreference('dailyReminder')}
              trackColor={{ false: '#e0e0e0', true: '#8cb89d' }}
              thumbColor={preferences.dailyReminder ? '#355e3b' : '#f4f4f4'}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingIcon}>
              <Ionicons name="calendar" size={24} color="#355e3b" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Weekly Report</Text>
              <Text style={styles.settingDescription}>
                Get a weekly summary of your spending and budget status
              </Text>
            </View>
            <Switch
              value={preferences.weeklyReport}
              onValueChange={() => togglePreference('weeklyReport')}
              trackColor={{ false: '#e0e0e0', true: '#8cb89d' }}
              thumbColor={preferences.weeklyReport ? '#355e3b' : '#f4f4f4'}
            />
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Notification preferences are saved locally. The actual notification
              functionality will be implemented in a future update.
            </Text>
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  intro: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
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
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
});
