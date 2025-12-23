import { NetWorthItem } from '@/lib/db/models/net-worth';

export type ActiveFieldType = 'liquid' | 'illiquid' | 'retirement' | 'liability';

export interface ActiveField {
  id: string;
  type: ActiveFieldType;
}

export interface NetWorthFormData {
  liquidAssets: NetWorthItem[];
  illiquidAssets: NetWorthItem[];
  retirementAssets: NetWorthItem[];
  liabilities: NetWorthItem[];
  notes: string;
}
