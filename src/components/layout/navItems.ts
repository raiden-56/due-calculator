import {
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  Gift,
  LayoutDashboard,
  type LucideIcon,
  ReceiptIndianRupee,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'People', to: '/people', icon: Users },
  { label: 'Money Records', to: '/records', icon: Wallet },
  { label: 'Payments', to: '/payments', icon: ReceiptIndianRupee },
  { label: 'Cashback', to: '/cashback', icon: Gift },
  { label: 'Monthly Overview', to: '/monthly', icon: CalendarDays },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Excel Import / Export', to: '/excel', icon: FileSpreadsheet },
  { label: 'Settings', to: '/settings', icon: Settings },
];
