import { useState, useMemo } from 'react';

export function useExpenseMonth() {
  // Calculate current month in YYYY-MM format
  const currentMonth = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  // Selected month state (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Format selected month for display (e.g., "December 2025")
  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() - 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() + 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newYear}-${newMonth}`);
  };

  // Direct month setter (for dropdown picker)
  const setMonth = (month: string) => {
    setSelectedMonth(month);
  };

  return {
    selectedMonth,
    monthLabel,
    currentMonth,
    goToPreviousMonth,
    goToNextMonth,
    setMonth,
  };
}
