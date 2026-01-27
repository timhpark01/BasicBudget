import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scaleFontSize } from '@/lib/utils/responsive';
import NotificationsModal from '@/components/modals/settings/NotificationsModal';
import CategoriesModal from '@/components/modals/categories/CategoriesModal';
import AdvancedSettingsModal from '@/components/modals/settings/AdvancedSettingsModal';
import BudgetCalculatorModal from '@/components/modals/budget/BudgetCalculatorModal';
import InsightsModal from '@/components/modals/analytics/InsightsModal';
import ExportCSVModal from '@/components/modals/analytics/ExportCSVModal';
import ImportCSVModal from '@/components/modals/analytics/ImportCSVModal';
import HelpModal from '@/components/modals/HelpModal';
import AboutModal from '@/components/modals/settings/AboutModal';
import ShortcutModal from '@/components/modals/ShortcutModal';

export default function MoreScreen() {
  // Responsive sizing
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [advancedSettingsModalVisible, setAdvancedSettingsModalVisible] = useState(false);
  const [budgetCalculatorModalVisible, setBudgetCalculatorModalVisible] = useState(false);
  const [insightsModalVisible, setInsightsModalVisible] = useState(false);
  const [exportCSVModalVisible, setExportCSVModalVisible] = useState(false);
  const [importCSVModalVisible, setImportCSVModalVisible] = useState(false);
  const [shortcutModalVisible, setShortcutModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: moderateScale(100) }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setCategoriesModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="pricetag-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Categories</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setAdvancedSettingsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Advanced</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tools</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setBudgetCalculatorModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calculator-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Budget Calculator</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setInsightsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="bulb-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Insights</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setExportCSVModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Export CSV</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setImportCSVModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Import CSV</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShortcutModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={24} color="#333" />
            <Text style={styles.menuText}>iOS Shortcuts</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setHelpModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setAboutModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={24} color="#333" />
            <Text style={styles.menuText}>About</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <NotificationsModal
        visible={notificationsModalVisible}
        onClose={() => setNotificationsModalVisible(false)}
      />

      <CategoriesModal
        visible={categoriesModalVisible}
        onClose={() => setCategoriesModalVisible(false)}
      />

      <AdvancedSettingsModal
        visible={advancedSettingsModalVisible}
        onClose={() => setAdvancedSettingsModalVisible(false)}
      />

      <BudgetCalculatorModal
        visible={budgetCalculatorModalVisible}
        onClose={() => setBudgetCalculatorModalVisible(false)}
      />

      <InsightsModal
        visible={insightsModalVisible}
        onClose={() => setInsightsModalVisible(false)}
      />

      <ExportCSVModal
        visible={exportCSVModalVisible}
        onClose={() => setExportCSVModalVisible(false)}
      />

      <ImportCSVModal
        visible={importCSVModalVisible}
        onClose={() => setImportCSVModalVisible(false)}
      />

      <ShortcutModal
        visible={shortcutModalVisible}
        onClose={() => setShortcutModalVisible(false)}
      />

      <HelpModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
      />

      <AboutModal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: moderateScale(16),
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(8),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: scaleFontSize(16),
    marginLeft: moderateScale(16),
    color: '#333',
  },
});
