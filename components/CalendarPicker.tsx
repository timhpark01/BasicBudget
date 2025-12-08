import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CalendarPickerProps {
  currentDate: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isDisabled: boolean;
}

export default function CalendarPicker({
  currentDate,
  onConfirm,
  onCancel,
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(currentDate));
  const [tempSelectedDate, setTempSelectedDate] = useState<Date>(currentDate);

  // Reset to current date when component mounts
  useEffect(() => {
    setCurrentMonth(new Date(currentDate));
    setTempSelectedDate(currentDate);
  }, [currentDate]);

  // Date comparison utilities
  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isBeforeOrSame = (date: Date, maxDate: Date): boolean => {
    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const d2 = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    return d1 <= d2;
  };

  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
  };

  // Generate calendar days (6 rows × 7 columns = 42 cells)
  const generateCalendarDays = useMemo((): CalendarDay[] => {
    const days: CalendarDay[] = [];
    const today = new Date();

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const lastDate = lastDay.getDate();

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthLastDate = prevMonthLastDay.getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDate - i);
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: true,
      });
    }

    // Current month days
    for (let day = 1; day <= lastDate; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isDisabled: !isBeforeOrSame(date, today),
      });
    }

    // Next month padding to reach 42 cells
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: true,
      });
    }

    return days;
  }, [currentMonth]);

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  // Handle date selection
  const handleDateSelect = (day: CalendarDay) => {
    if (!day.isDisabled && day.isCurrentMonth) {
      setTempSelectedDate(day.date);
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    onConfirm(tempSelectedDate);
  };

  // Handle cancel
  const handleCancel = () => {
    onCancel();
  };

  // Format month/year for header
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with month/year and navigation arrows */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.arrowButton}
          onPress={goToPreviousMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>

        <Text style={styles.monthYearText}>{formatMonthYear(currentMonth)}</Text>

        <TouchableOpacity
          style={styles.arrowButton}
          onPress={goToNextMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Day of week labels */}
      <View style={styles.dayLabelsContainer}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <View key={index} style={styles.dayLabel}>
            <Text style={styles.dayLabelText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Date grid */}
      <View style={styles.dateGrid}>
          {generateCalendarDays.map((day, index) => {
            const isSelected = isSameDay(day.date, tempSelectedDate);
            const isTodayDate = isToday(day.date);

            return (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.dateCell,
                  pressed && !day.isDisabled && styles.dateCellPressed,
                ]}
                onPress={() => handleDateSelect(day)}
                disabled={day.isDisabled}
              >
                <View
                  style={[
                    styles.dateCellInner,
                    isSelected && styles.dateCellInnerSelected,
                    isTodayDate && !isSelected && styles.dateCellInnerToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dateCellText,
                      !day.isCurrentMonth && styles.dateCellTextOtherMonth,
                      day.isDisabled && styles.dateCellTextDisabled,
                      isSelected && styles.dateCellTextSelected,
                    ]}
                  >
                    {day.date.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton]}
          onPress={handleConfirm}
          activeOpacity={0.7}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    height: 56,
  },
  arrowButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dayLabelsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    height: 32,
    alignItems: 'center',
  },
  dayLabel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    flex: 1,
  },
  dateCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  dateCellPressed: {
    opacity: 0.7,
  },
  dateCellInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dateCellInnerSelected: {
    backgroundColor: '#355e3b',
  },
  dateCellInnerToday: {
    borderWidth: 2,
    borderColor: '#355e3b',
  },
  dateCellText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dateCellTextOtherMonth: {
    color: '#999',
  },
  dateCellTextDisabled: {
    color: '#e0e0e0',
  },
  dateCellTextSelected: {
    color: '#fff',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#355e3b',
    marginLeft: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
