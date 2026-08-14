import React from 'react';

type Tab = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
};

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => (
  <div className="ui-tabs" role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={tab.id === active}
        className={`ui-tabs__tab ${tab.id === active ? 'ui-tabs__tab--active' : ''}`.trim()}
        onClick={() => onChange(tab.id)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const TabPanel: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => {
  if (!active) return null;
  return (
    <div className="ui-tab-panel" role="tabpanel">
      {children}
    </div>
  );
};
