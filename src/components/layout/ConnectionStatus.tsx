import React from 'react';
import { Wifi, WifiOff, Database, AlertCircle } from 'lucide-react';
import { useConnectionStatus, ConnectionStatus as StatusType } from '../../hooks/useConnectionStatus';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const { status, isLoading, refresh } = useConnectionStatus();

  const getStatusInfo = () => {
    if (isLoading || status === 'checking') {
      return {
        icon: <Database className="w-4 h-4 animate-pulse" />,
        color: 'text-slate-400',
        bgColor: 'bg-slate-100',
        tooltip: 'Checking connection...',
        label: 'Checking'
      };
    }

    if (status === 'connected') {
      return {
        icon: <Wifi className="w-4 h-4" />,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        tooltip: 'Connected to Zoho Analytics',
        label: 'Connected'
      };
    }

    if (status === 'error') {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        tooltip: 'Connection error - check configuration',
        label: 'Error'
      };
    }

    // Default to mock data
    return {
      icon: <WifiOff className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      tooltip: 'Using mock data (Zoho Analytics not connected)',
      label: 'Mock Data'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`relative group ${className}`}>
      <button
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${statusInfo.bgColor} ${statusInfo.color} hover:opacity-80 transition-all duration-200`}
        title={statusInfo.tooltip}
        onClick={refresh}
      >
        {statusInfo.icon}
        <span className="text-xs font-medium hidden sm:inline">
          {isLoading ? 'Checking...' : statusInfo.label}
        </span>
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {statusInfo.tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
