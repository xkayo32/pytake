'use client';

import { useState, ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: ReactNode;
  badge?: string | number;
}

interface PropertyTabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function PropertyTabs({ tabs, defaultTab }: PropertyTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4 -mx-4">
        <div className="flex overflow-x-auto px-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0
                  ${isActive
                    ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
                title={tab.label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="max-w-[120px] truncate">{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        {currentTab?.content}
      </div>
    </div>
  );
}
