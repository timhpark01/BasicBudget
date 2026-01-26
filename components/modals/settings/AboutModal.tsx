import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AboutModal({ visible, onClose }: AboutModalProps) {
  const version = Constants.expoConfig?.version || '1.0.0';

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
          <Text style={styles.title}>About</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="wallet" size={80} color="#355e3b" />
          </View>

          <Text style={styles.appName}>BasicBudget</Text>
          <Text style={styles.version}>Version {version}</Text>
          <Text style={styles.tagline}>
            Simple, straightforward expense tracking
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Policy</Text>
            <Text style={styles.sectionText}>
              BasicBudget is committed to protecting your privacy. All your
              financial data is stored locally on your device using SQLite
              database.
            </Text>
            <Text style={styles.sectionText}>
              • No data is ever transmitted to external servers{'\n'}
              • No account registration required{'\n'}
              • No tracking or analytics{'\n'}
              • Your data stays on your device
            </Text>
            <Text style={styles.sectionText}>
              Your expenses, budgets, and personal information remain completely
              private and under your control.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credits & Attributions</Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>Developer:</Text> Timothy Park
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.bold}>Built with:</Text>
            </Text>
            <Text style={styles.sectionText}>
              • React Native & Expo{'\n'}
              • TypeScript{'\n'}
              • SQLite (expo-sqlite){'\n'}
              • React Navigation{'\n'}
              • Shoutout Claude Code
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Open Source</Text>
            <Text style={styles.sectionText}>
              BasicBudget is built with open-source technologies and libraries.
              We're grateful to the open-source community for making tools like
              this possible.
            </Text>
          </View>

          <Text style={styles.copyright}>
            © 2025 BasicBudget. All rights reserved.
          </Text>
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
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#355e3b',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  copyright: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
});
