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
import ProfileModal from '@/components/modals/settings/ProfileModal';
import NotificationsModal from '@/components/modals/settings/NotificationsModal';
import CategoriesModal from '@/components/modals/categories/CategoriesModal';
import AdvancedSettingsModal from '@/components/modals/settings/AdvancedSettingsModal';
import BudgetCalculatorModal from '@/components/modals/budget/BudgetCalculatorModal';
import InsightsModal from '@/components/modals/analytics/InsightsModal';
import HelpModal from '@/components/modals/HelpModal';
import AboutModal from '@/components/modals/settings/AboutModal';

export default function MoreScreen() {
  // Responsive sizing
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [advancedSettingsModalVisible, setAdvancedSettingsModalVisible] = useState(false);
  const [budgetCalculatorModalVisible, setBudgetCalculatorModalVisible] = useState(false);
  const [insightsModalVisible, setInsightsModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + moderateScale(20) }}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setProfileModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Profile</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setNotificationsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

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

      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />

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
