'use client'

import {
  HomeIcon as HomeSolid,
  UserIcon as UserSolid,
  BellIcon as BellSolid,
  MagnifyingGlassIcon as SearchSolid,
  UserGroupIcon as GroupSolid,
} from '@heroicons/react/24/solid'

interface Tab {
  id: string
  label: string
  icon: any
}

interface MobileBottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: Tab[]
  unreadCount?: number
}

const SOLID_ICONS: Record<string, any> = {
  home: HomeSolid,
  profile: UserSolid,
  notifications: BellSolid,
  search: SearchSolid,
  groups: GroupSolid,
}

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  tabs,
  unreadCount = 0,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/85 backdrop-blur-xl border-t border-gray-200/70 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const OutlineIcon = tab.icon
          const SolidIcon = SOLID_ICONS[tab.id] || OutlineIcon
          const isActive = activeTab === tab.id
          const Icon = isActive ? SolidIcon : OutlineIcon
          const isNotifications = tab.id === 'notifications'
          const showBadge = isNotifications && unreadCount > 0

          return (
            <li key={tab.id} className="flex">
              <button
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className="group relative flex-1 flex flex-col items-center justify-center gap-1 select-none outline-none"
              >
                <span
                  className={`relative flex items-center justify-center h-9 w-12 rounded-2xl transition-all duration-200 ease-out ${
                    isActive
                      ? 'bg-brand-green-700/10 scale-100'
                      : 'bg-transparent scale-95 group-active:scale-90'
                  }`}
                >
                  <Icon
                    className={`w-[22px] h-[22px] transition-colors duration-200 ${
                      isActive ? 'text-brand-green-700' : 'text-gray-500 group-hover:text-gray-700'
                    }`}
                  />
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center ring-2 ring-white">
                      <span className="text-white text-[10px] font-bold leading-none tracking-tight">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10.5px] leading-none tracking-tight transition-colors duration-200 ${
                    isActive
                      ? 'text-brand-green-700 font-semibold'
                      : 'text-gray-500 font-medium group-hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
