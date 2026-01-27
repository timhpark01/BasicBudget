export interface QuickStartStep {
  title: string;
  description: string;
  icon: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export const QUICK_START_STEPS: QuickStartStep[] = [
  {
    title: 'Add Your First Expense',
    description: 'Tap the green + button on the Budgets tab to add an expense. Choose a category, enter the amount, and optionally add notes.',
    icon: 'add-circle',
  },
  {
    title: 'Set a Monthly Budget',
    description: 'Tap "Set Budget" at the top of the Budgets tab to set your spending goal for the month. Track your progress with the visual indicator.',
    icon: 'pie-chart',
  },
  {
    title: 'View Your Spending Charts',
    description: 'Switch to the Charts tab to see daily spending calendar, spending trends over time, and category breakdowns.',
    icon: 'stats-chart',
  },
  {
    title: 'Manage Your Expenses',
    description: 'Swipe left on any expense to quickly delete it. Tap an expense to view details, edit, duplicate, or delete it.',
    icon: 'create',
  },
  {
    title: 'Customize Categories',
    description: 'Go to More > Categories to add your own custom expense categories with personalized icons and colors.',
    icon: 'pricetag',
  },
];

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I edit an expense?',
    answer: 'Figure it out yourself bozo',
  },
  {
    question: 'How do I delete an expense?',
    answer: 'Swipe left on any expense and tap the red delete button. You can also tap the expense, then tap "Delete" in the detail view. You\'ll have 4 seconds to undo the deletion.',
  },
  {
    question: 'Can I duplicate an expense?',
    answer: 'Yes! Tap on an expense to view its details, then tap the "Duplicate" button. This creates a new expense with the same category and amount but with the current date.',
  },
  {
    question: 'Where is my data stored?',
    answer: 'All your data is stored locally on your device using SQLite. Your expenses, budgets, and settings never leave your phone, ensuring complete privacy.',
  },
  {
    question: 'How do I backup my data?',
    answer: 'Currently, data is stored only on your device. Make sure to keep your device backed up using your phone\'s built-in backup system (iCloud for iOS, Google Backup for Android).',
  },
  {
    question: 'Can I view expenses from previous months?',
    answer: 'Yes! Use the left/right arrows at the top of the Budgets or Charts tabs to navigate between different months.',
  },
  {
    question: 'How do budgets work?',
    answer: 'Set a budget for any month, and the app will track your spending against that budget. You\'ll see a progress bar showing how much you\'ve spent, with color indicators when you\'re approaching or exceeding your budget.',
  },
  {
    question: 'Can I add custom categories?',
    answer: 'Yes! Go to More > Categories to create custom expense categories. Choose a name, icon, and color for each category. Custom categories will appear alongside default categories when adding expenses.',
  },
  {
    question: 'What happens if I delete a category I\'ve used?',
    answer: 'If you try to delete a category that has expenses, you\'ll be asked to reassign those expenses to another category (like "Unlabeled") before deletion.',
  },
  {
    question: 'Does this app require internet?',
    answer: 'No! BasicBudget works completely offline. All features are available without an internet connection.',
  },
];
