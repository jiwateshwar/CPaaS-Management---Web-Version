import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Route,
  Receipt,
  Upload,
  BookOpen,
  Globe,
  DollarSign,
  Settings,
  ScrollText,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/routing', label: 'Routing', icon: Route },
  { to: '/rates', label: 'Rates', icon: Receipt },
  { to: '/uploads', label: 'Upload Center', icon: Upload },
  { to: '/ledger', label: 'Ledger', icon: BookOpen },
  { to: '/countries', label: 'Country Mapping', icon: Globe },
  { to: '/fx-rates', label: 'FX Rates', icon: DollarSign },
  { to: '/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="flex h-14 items-center px-4 border-b border-white/10">
        <h1 className="text-lg font-bold tracking-tight">CPaaS Mgmt</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                'hover:bg-white/10',
                isActive && 'bg-[hsl(var(--sidebar-active))] text-white font-medium',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-xs text-white/50">
        v1.0.0
      </div>
    </aside>
  );
}
