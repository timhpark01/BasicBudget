import { useState, useEffect, useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { NetWorthItem } from '@/lib/db/models/net-worth';
import { NetWorthEntryCompat } from '@/hooks/useNetWorth';
import { ActiveField, ActiveFieldType } from './types';
import { canAddDecimalDigit } from '@/lib/utils/number-formatter';

// Maximum amount to prevent UI overflow (10 million)
const MAX_AMOUNT = 9999999999999.99;

interface UseNetWorthCalculatorProps {
  selectedEntry: NetWorthEntryCompat | undefined;
  mostRecentEntry: NetWorthEntryCompat | null;
}

export function useNetWorthCalculator({
  selectedEntry,
  mostRecentEntry,
}: UseNetWorthCalculatorProps) {
  // Helper to generate unique ID
  const generateId = (): string => {
    try {
      return Crypto.randomUUID();
    } catch (err) {
      return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  };

  // Form state for entry view - organized by category
  const [liquidAssets, setLiquidAssets] = useState<NetWorthItem[]>([
    { id: '1', name: 'Savings', amount: '0', category: 'liquid' },
  ]);
  const [illiquidAssets, setIlliquidAssets] = useState<NetWorthItem[]>([
    { id: '1', name: 'Real Estate', amount: '0', category: 'illiquid' },
  ]);
  const [retirementAssets, setRetirementAssets] = useState<NetWorthItem[]>([
    { id: '1', name: 'Retirement', amount: '0', category: 'retirement' },
  ]);
  const [liabilities, setLiabilities] = useState<NetWorthItem[]>([
    { id: '1', name: 'Credit Card Debt', amount: '0' },
  ]);
  const [notes, setNotes] = useState('');
  const [activeField, setActiveField] = useState<ActiveField | null>(null);
  const [calculatorAmount, setCalculatorAmount] = useState('0');

  // Update form data when selected entry changes
  useEffect(() => {
    // Categorize asset by category field, falling back to name matching for unmigrated data
    const getAssetCategory = (item: NetWorthItem): 'liquid' | 'illiquid' | 'retirement' => {
      if (item.category) return item.category;
      const illiquidNames = ['Real Estate', 'Vehicles', 'Other Assets'];
      const retirementNames = ['Retirement', '401k', 'IRA'];
      if (illiquidNames.includes(item.name)) return 'illiquid';
      if (retirementNames.includes(item.name)) return 'retirement';
      return 'liquid';
    };

    if (selectedEntry) {
      const liquid = selectedEntry.assets.filter(a => getAssetCategory(a) === 'liquid');
      const illiquid = selectedEntry.assets.filter(a => getAssetCategory(a) === 'illiquid');
      const retirement = selectedEntry.assets.filter(a => getAssetCategory(a) === 'retirement');

      setLiquidAssets(liquid);
      setIlliquidAssets(illiquid);
      setRetirementAssets(retirement);
      setLiabilities(selectedEntry.liabilities);
      setNotes(selectedEntry.notes);
    } else if (mostRecentEntry) {
      // Prepopulate from most recent entry
      const liquid = mostRecentEntry.assets.filter(a => getAssetCategory(a) === 'liquid');
      const illiquid = mostRecentEntry.assets.filter(a => getAssetCategory(a) === 'illiquid');
      const retirement = mostRecentEntry.assets.filter(a => getAssetCategory(a) === 'retirement');

      // Generate new IDs to prevent conflicts
      setLiquidAssets(liquid.map(item => ({ ...item, id: generateId() })));
      setIlliquidAssets(illiquid.map(item => ({ ...item, id: generateId() })));
      setRetirementAssets(retirement.map(item => ({ ...item, id: generateId() })));
      setLiabilities(mostRecentEntry.liabilities.map(item => ({ ...item, id: generateId() })));
      setNotes(''); // Clear notes (date-specific)
    } else {
      // Reset form for new entry - start with one item in each category
      setLiquidAssets([{ id: generateId(), name: 'Savings', amount: '0', category: 'liquid' }]);
      setIlliquidAssets([{ id: generateId(), name: 'Real Estate', amount: '0', category: 'illiquid' }]);
      setRetirementAssets([{ id: generateId(), name: 'Retirement', amount: '0', category: 'retirement' }]);
      setLiabilities([{ id: generateId(), name: 'Credit Card Debt', amount: '0' }]);
      setNotes('');
    }
  }, [selectedEntry, mostRecentEntry]);

  // Add/Update/Delete functions for liquid assets
  const addLiquidAsset = () => {
    const newAsset: NetWorthItem = {
      id: generateId(),
      name: '',
      amount: '0',
      category: 'liquid',
    };
    setLiquidAssets([...liquidAssets, newAsset]);
  };

  const updateLiquidAsset = (id: string, field: 'name' | 'amount', value: string) => {
    setLiquidAssets(liquidAssets.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLiquidAsset = (id: string) => {
    setLiquidAssets(liquidAssets.filter(item => item.id !== id));
  };

  // Add/Update/Delete functions for illiquid assets
  const addIlliquidAsset = () => {
    const newAsset: NetWorthItem = {
      id: generateId(),
      name: '',
      amount: '0',
      category: 'illiquid',
    };
    setIlliquidAssets([...illiquidAssets, newAsset]);
  };

  const updateIlliquidAsset = (id: string, field: 'name' | 'amount', value: string) => {
    setIlliquidAssets(illiquidAssets.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeIlliquidAsset = (id: string) => {
    setIlliquidAssets(illiquidAssets.filter(item => item.id !== id));
  };

  // Add/Update/Delete functions for retirement assets
  const addRetirementAsset = () => {
    const newAsset: NetWorthItem = {
      id: generateId(),
      name: '',
      amount: '0',
      category: 'retirement',
    };
    setRetirementAssets([...retirementAssets, newAsset]);
  };

  const updateRetirementAsset = (id: string, field: 'name' | 'amount', value: string) => {
    setRetirementAssets(retirementAssets.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeRetirementAsset = (id: string) => {
    setRetirementAssets(retirementAssets.filter(item => item.id !== id));
  };

  // Add/Update/Delete functions for liabilities
  const addLiability = () => {
    const newLiability: NetWorthItem = {
      id: generateId(),
      name: '',
      amount: '0',
    };
    setLiabilities([...liabilities, newLiability]);
  };

  const updateLiability = (id: string, field: 'name' | 'amount', value: string) => {
    setLiabilities(liabilities.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeLiability = (id: string) => {
    setLiabilities(liabilities.filter(item => item.id !== id));
  };

  // Calculator keypad handlers
  const handleAmountFieldPress = (id: string, type: ActiveFieldType, currentAmount: string) => {
    setActiveField({ id, type });
    setCalculatorAmount(currentAmount === '0' ? '0' : currentAmount);
  };

  const handleCalculatorNumberPress = (num: string) => {
    // Check if adding this digit would exceed 2 decimal places
    if (!canAddDecimalDigit(calculatorAmount)) {
      return;
    }

    let newAmount: string;
    if (calculatorAmount === '0') {
      newAmount = num;
    } else {
      newAmount = calculatorAmount + num;
    }

    // Check if the new amount would exceed the maximum
    const newAmountNum = parseFloat(newAmount);
    if (!isNaN(newAmountNum) && newAmountNum > MAX_AMOUNT) {
      return; // Don't add the digit if it exceeds the max
    }

    setCalculatorAmount(newAmount);
  };

  const handleCalculatorDecimalPress = () => {
    if (!calculatorAmount.includes('.')) {
      setCalculatorAmount(calculatorAmount + '.');
    }
  };

  const handleCalculatorBackspace = () => {
    if (calculatorAmount.length === 1) {
      setCalculatorAmount('0');
    } else {
      setCalculatorAmount(calculatorAmount.slice(0, -1));
    }
  };

  const handleCalculatorClear = () => {
    setCalculatorAmount('0');
  };

  const handleCalculatorDone = () => {
    if (activeField) {
      // Update the appropriate field based on type
      switch (activeField.type) {
        case 'liquid':
          updateLiquidAsset(activeField.id, 'amount', calculatorAmount);
          break;
        case 'illiquid':
          updateIlliquidAsset(activeField.id, 'amount', calculatorAmount);
          break;
        case 'retirement':
          updateRetirementAsset(activeField.id, 'amount', calculatorAmount);
          break;
        case 'liability':
          updateLiability(activeField.id, 'amount', calculatorAmount);
          break;
      }
      setActiveField(null);
      setCalculatorAmount('0');
    }
  };

  // Calculate totals from form
  const formLiquidAssets = liquidAssets.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const formIlliquidAssets = illiquidAssets.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const formRetirementAssets = retirementAssets.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const formTotalAssets = formLiquidAssets + formIlliquidAssets + formRetirementAssets;
  const formLiabilities = liabilities.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const formNetWorth = formTotalAssets - formLiabilities;

  return {
    // State
    liquidAssets,
    illiquidAssets,
    retirementAssets,
    liabilities,
    notes,
    setNotes,
    activeField,
    calculatorAmount,

    // Liquid asset handlers
    addLiquidAsset,
    updateLiquidAsset,
    removeLiquidAsset,

    // Illiquid asset handlers
    addIlliquidAsset,
    updateIlliquidAsset,
    removeIlliquidAsset,

    // Retirement asset handlers
    addRetirementAsset,
    updateRetirementAsset,
    removeRetirementAsset,

    // Liability handlers
    addLiability,
    updateLiability,
    removeLiability,

    // Calculator handlers
    handleAmountFieldPress,
    handleCalculatorNumberPress,
    handleCalculatorDecimalPress,
    handleCalculatorBackspace,
    handleCalculatorClear,
    handleCalculatorDone,

    // Calculated values
    formLiquidAssets,
    formIlliquidAssets,
    formRetirementAssets,
    formTotalAssets,
    formLiabilities,
    formNetWorth,
  };
}
