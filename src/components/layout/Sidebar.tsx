import React from 'react';
import { tableConfigs } from '../../config/tableConfigs';

interface SidebarProps {
  activeTable: string;
  onTableChange: (tableName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTable, onTableChange }) => {
  return (
    <aside className="w-72 bg-white border-r border-slate-200 h-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Tables</h2>
        
        <nav className="space-y-2">
          {Object.entries(tableConfigs).map(([tableName, config]) => {
            const Icon = config.icon;
            const isActive = activeTable === tableName;
            
            return (
              <button
                key={tableName}
                onClick={() => onTableChange(tableName)}
                className={`sidebar-item w-full text-left ${
                  isActive ? 'active' : ''
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium">{config.name}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Divider */}
        <div className="border-t border-slate-200 my-6"></div>
        
        {/* Additional Navigation */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Tools</h3>
          
          <button className="sidebar-item w-full text-left">
            <div className="w-5 h-5 mr-3 bg-slate-200 rounded"></div>
            <span className="font-medium">Data Import</span>
          </button>
          
          <button className="sidebar-item w-full text-left">
            <div className="w-5 h-5 mr-3 bg-slate-200 rounded"></div>
            <span className="font-medium">Reports</span>
          </button>
          
          <button className="sidebar-item w-full text-left">
            <div className="w-5 h-5 mr-3 bg-slate-200 rounded"></div>
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

