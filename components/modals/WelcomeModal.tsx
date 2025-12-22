import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WelcomeModalProps {
  visible: boolean;
  onNext: () => void;
}

export default function WelcomeModal({ visible, onNext }: WelcomeModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onNext}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="wallet" size={80} color="#355e3b" />
          </View>

          <Text style={styles.title}>Welcome to BasicBudget</Text>

          <Text style={styles.subtitle}>
            Your simple, straightforward expense tracker
          </Text>

          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="add-circle" size={32} color="#355e3b" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Track Expenses</Text>
                <Text style={styles.featureDescription}>
                  Quickly add expenses with amount, category, date, and notes
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="pie-chart" size={32} color="#355e3b" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Set Monthly Budgets</Text>
                <Text style={styles.featureDescription}>
                  Stay on track with budget goals and progress monitoring
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="stats-chart" size={32} color="#355e3b" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Visualize Spending</Text>
                <Text style={styles.featureDescription}>
                  View charts and insights to understand your spending patterns
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="phone-portrait" size={32} color="#355e3b" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Works Offline</Text>
                <Text style={styles.featureDescription}>
                  All your data stays on your device - no internet required
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={onNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 100,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  featuresContainer: {
    gap: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#355e3b',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
