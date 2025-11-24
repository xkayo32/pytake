import React, { useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  variant?: 'default' | 'compact';
  onChange?: (tabId: string) => void;
}

export default function Tabs({
  tabs,
  defaultTab,
  variant = 'default',
  onChange,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  if (variant === 'compact') {
    return (
      <div className="h-full flex flex-col">
        {/* Tab buttons - horizontal scrollable */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400'
                  : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTabData && <div className="p-6">{activeTabData.content}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab buttons */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'text-purple-600 dark:text-purple-400 bg-gray-50 dark:bg-gray-700/50'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTabData && <div className="p-6">{activeTabData.content}</div>}
      </div>
    </div>
  );
}
