import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

interface ShortcutModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ShortcutModal({ visible, onClose }: ShortcutModalProps) {
  const handleCopyURL = async () => {
    await Clipboard.setStringAsync('basicbudget://add-expense?amount=');
    Toast.show({
      type: 'success',
      text1: 'URL copied!',
      text2: 'Paste this in the Shortcuts app',
      position: 'top',
      visibilityTime: 2000,
    });
  };

  const handleOpenShortcutsApp = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('shortcuts://');
    }
  };

  const handleOpenShortcutLink = () => {
    Linking.openURL('https://www.icloud.com/shortcuts/146912d28de94a5bb15fed7d046ba946');
  };

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
          <Text style={styles.title}>iOS Shortcuts</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.intro}>
            <Ionicons name="flash" size={48} color="#355e3b" />
            <Text style={styles.introText}>
              Add expenses instantly using Siri or iOS Shortcuts without opening the app!
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Setup (Recommended)</Text>
            <View style={styles.quickSetupCard}>
              <Ionicons name="download-outline" size={32} color="#355e3b" />
              <Text style={styles.quickSetupText}>
                Get the pre-configured shortcut with just one tap!
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleOpenShortcutLink}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Download Shortcut</Text>
              </TouchableOpacity>
              <Text style={styles.quickSetupNote}>
                This will open the Shortcuts app and prompt you to add the "Add Expense" shortcut.
              </Text>
            </View>

            <View style={styles.homeScreenCard}>
              <View style={styles.homeScreenHeader}>
                <Ionicons name="home-outline" size={24} color="#355e3b" />
                <Text style={styles.homeScreenTitle}>Add to Home Screen</Text>
              </View>
              <Text style={styles.homeScreenDescription}>
                After downloading the shortcut, add it to your home screen for quick access:
              </Text>
              <View style={styles.instructionList}>
                <View style={styles.instructionItem}>
                  <Text style={styles.bulletPoint}>1.</Text>
                  <Text style={styles.instructionText}>
                    Open the <Text style={styles.bold}>Shortcuts app</Text>
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.bulletPoint}>2.</Text>
                  <Text style={styles.instructionText}>
                    Find and tap on the <Text style={styles.bold}>"Add Expense"</Text> shortcut
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.bulletPoint}>3.</Text>
                  <Text style={styles.instructionText}>
                    Tap the <Ionicons name="ellipsis-horizontal-circle" size={14} color="#666" /> menu icon in the top right
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.bulletPoint}>4.</Text>
                  <Text style={styles.instructionText}>
                    Select <Text style={styles.bold}>"Add to Home Screen"</Text>
                  </Text>
                </View>
                <View style={styles.instructionItem}>
                  <Text style={styles.bulletPoint}>5.</Text>
                  <Text style={styles.instructionText}>
                    Customize the name and icon (optional), then tap <Text style={styles.bold}>"Add"</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.bonusTip}>
                <Ionicons name="bulb-outline" size={18} color="#f59e0b" />
                <Text style={styles.bonusTipText}>
                  <Text style={styles.bold}>Bonus:</Text> Enable Siri by saying "Hey Siri, add expense" the first time you run it!
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manual Setup</Text>
            <Text style={styles.manualSetupIntro}>
              Prefer to build it yourself? Follow these steps:
            </Text>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Open Shortcuts App</Text>
              </View>
              <Text style={styles.stepDescription}>
                Tap the button below to open the iOS Shortcuts app
              </Text>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleOpenShortcutsApp}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Open Shortcuts App</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Create New Shortcut</Text>
              </View>
              <Text style={styles.stepDescription}>
                Tap the "+" button in the top right corner to create a new shortcut
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Add "Ask for Input" Action</Text>
              </View>
              <Text style={styles.stepDescription}>
                Search for and add "Ask for Input" action with these settings:{'\n\n'}
                • Question: "What's the amount?"{'\n'}
                • Input Type: Number{'\n'}
                • Toggle OFF "Require Input" to make it optional
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepTitle}>Add "Text" Action</Text>
              </View>
              <Text style={styles.stepDescription}>
                Search for and add "Text" action. In the text field, build this URL:{'\n\n'}
                basicbudget://add-expense?amount=[Amount]{'\n\n'}
                Where [Amount] is the blue variable from step 3
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyURL}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={18} color="#355e3b" />
                <Text style={styles.copyButtonText}>Copy Base URL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>5</Text>
                </View>
                <Text style={styles.stepTitle}>Add "Open URLs" Action</Text>
              </View>
              <Text style={styles.stepDescription}>
                Search for and add "Open URLs" action. It should automatically connect to the Text from step 4.
              </Text>
            </View>

            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>6</Text>
                </View>
                <Text style={styles.stepTitle}>Name Your Shortcut</Text>
              </View>
              <Text style={styles.stepDescription}>
                Tap the shortcut name at the top and rename it to "Add Expense" or similar. You can also:{'\n\n'}
                • Add to Home Screen{'\n'}
                • Enable Siri ("Hey Siri, add expense"){'\n'}
                • Add to widgets
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional: Add Note Field</Text>
            <View style={styles.tipCard}>
              <Ionicons name="information-circle" size={24} color="#355e3b" />
              <Text style={styles.tipText}>
                To include an optional note, add another "Ask for Input" action after step 3 with:{'\n\n'}
                • Question: "Add a note? (optional)"{'\n'}
                • Input Type: Text{'\n\n'}
                Then in step 4, modify the URL to:{'\n'}
                basicbudget://add-expense?amount=[Amount]&note=[Note]
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                When you run the shortcut:{'\n\n'}
                1. You'll be asked for the amount{'\n'}
                2. The app will briefly open{'\n'}
                3. Expense is saved automatically{'\n'}
                4. Success toast appears{'\n\n'}
                All expenses added via shortcuts are categorized as "Unlabeled" with the current date/time.
              </Text>
            </View>
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
  },
  intro: {
    backgroundColor: '#f0f8f0',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  introText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  stepCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#355e3b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  stepDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#355e3b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#355e3b',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#355e3b',
    marginLeft: 6,
  },
  tipCard: {
    backgroundColor: '#fff7e6',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ffd666',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  quickSetupCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#355e3b',
  },
  quickSetupText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#355e3b',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  quickSetupNote: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  manualSetupIntro: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  homeScreenCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
  },
  homeScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  homeScreenTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  homeScreenDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  instructionList: {
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 4,
  },
  bulletPoint: {
    fontSize: 15,
    fontWeight: '600',
    color: '#355e3b',
    marginRight: 8,
    minWidth: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  bonusTip: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bonusTipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 8,
  },
});
