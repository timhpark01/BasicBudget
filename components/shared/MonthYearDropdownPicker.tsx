import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, scaleFontSize } from '@/lib/utils/responsive';

interface MonthYearDropdownPickerProps {
  selectedMonth: string; // YYYY-MM format
  monthLabel: string; // Formatted display string (e.g., "December 2025")
  onMonthChange: (month: string) => void; // Callback with YYYY-MM format
  style?: any;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function MonthYearDropdownPicker({
  selectedMonth,
  monthLabel,
  onMonthChange,
  style,
}: MonthYearDropdownPickerProps) {
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [yearsToShow, setYearsToShow] = useState(10); // Start with 10 years

  // Parse current selection
  const [currentYear, currentMonthIndex] = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return [parseInt(year), parseInt(month) - 1];
  }, [selectedMonth]);

  // Generate year range (current year going back based on yearsToShow)
  const years = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearList: number[] = [];
    for (let i = currentYear; i >= currentYear - yearsToShow; i--) {
      yearList.push(i);
    }
    return yearList;
  }, [yearsToShow]);

  // Reset yearsToShow when modal closes
  const handleCloseModal = () => {
    setIsDropdownVisible(false);
    setYearsToShow(10); // Reset to default when closing
  };

  // Load 10 more years
  const handleLoadMore = () => {
    setYearsToShow((prev) => prev + 10);
  };

  // Handle month selection
  const handleMonthSelect = (monthIndex: number, year: number) => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    onMonthChange(`${year}-${monthStr}`);
    handleCloseModal();
  };

  // Handle "Today" button
  const handleTodayPress = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    onMonthChange(`${year}-${month}`);
    handleCloseModal();
  };

  // Check if we can load more years (limit to 1900)
  const canLoadMore = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const oldestYear = currentYear - yearsToShow;
    return oldestYear > 1900;
  }, [yearsToShow]);

  return (
    <>
      <TouchableOpacity
        style={[styles.container, style]}
        onPress={() => setIsDropdownVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.monthLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{monthLabel}</Text>
        <Ionicons name="chevron-down" size={18} color="#333" />
      </TouchableOpacity>

      <Modal
        visible={isDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dropdownContainer}>
                <View style={styles.dropdownHeader}>
                  <Text style={styles.dropdownTitle}>Select Month & Year</Text>
                  <TouchableOpacity
                    onPress={handleCloseModal}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* Today Button */}
                <TouchableOpacity
                  style={styles.todayButton}
                  onPress={handleTodayPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={20} color="#355e3b" />
                  <Text style={styles.todayButtonText}>Go to Today</Text>
                </TouchableOpacity>

                <ScrollView style={styles.scrollView}>
                  {/* Year Sections */}
                  {years.map((year) => (
                    <View key={year} style={styles.yearSection}>
                      <Text style={styles.yearLabel}>{year}</Text>
                      <View style={styles.monthGrid}>
                        {MONTHS.map((month, index) => {
                          const isSelected =
                            year === currentYear && index === currentMonthIndex;
                          return (
                            <TouchableOpacity
                              key={`${year}-${index}`}
                              style={[
                                styles.monthButton,
                                isSelected && styles.monthButtonSelected,
                              ]}
                              onPress={() => handleMonthSelect(index, year)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.monthButtonText,
                                  isSelected && styles.monthButtonTextSelected,
                                ]}
                              >
                                {month}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}

                  {/* Load More Button */}
                  {canLoadMore && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={handleLoadMore}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.loadMoreText}>Load 10 More Years</Text>
                      <Ionicons name="chevron-down" size={20} color="#355e3b" />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flexShrink: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    width: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dropdownTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: '#333',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: moderateScale(12),
    margin: moderateScale(16),
    marginBottom: moderateScale(8),
    backgroundColor: '#f0f0f0',
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#355e3b',
  },
  todayButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    color: '#355e3b',
  },
  scrollView: {
    maxHeight: '100%',
  },
  yearSection: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearLabel: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    color: '#355e3b',
    marginBottom: moderateScale(12),
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  monthButton: {
    width: '30%',
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(8),
    backgroundColor: '#f5f5f5',
    borderRadius: moderateScale(6),
    alignItems: 'center',
  },
  monthButtonSelected: {
    backgroundColor: '#355e3b',
  },
  monthButtonText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    color: '#333',
  },
  monthButtonTextSelected: {
    color: '#fff',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: moderateScale(16),
    margin: moderateScale(16),
    marginTop: moderateScale(8),
    backgroundColor: '#f0f0f0',
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#355e3b',
  },
  loadMoreText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: '#355e3b',
  },
});
