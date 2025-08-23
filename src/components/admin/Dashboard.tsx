import React from 'react';
import { Users, Activity, TrendingUp, Clock, UserCheck, Database, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAuditLogStats } from '../../hooks/useAuditLogs';
import { useUserManagement } from '../../hooks/useUserManagement';
import LoadingSpinner from '../ui/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: auditStats, isLoading: statsLoading } = useAuditLogStats();
  const { users, isLoading: usersLoading } = useUserManagement();

  const isLoading = statsLoading || usersLoading;

  // Calculate user statistics
  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter(u => u.status === 'active')?.length || 0;
  // const inactiveUsers = totalUsers - activeUsers; // Unused variable - commented out
  const adminUsers = users?.filter(u => u.role === 'admin')?.length || 0;

  // Get recent activity from audit stats
  const recentActivity = auditStats?.recentActivity || [];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    description?: string;
  }> = ({ title, value, icon, color, description }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );

  const ActivityItem: React.FC<{
    log: any;
  }> = ({ log }) => {
    const getOperationColor = (operation: string) => {
      const colors = {
        CREATE: 'text-green-600',
        UPDATE: 'text-blue-600',
        DELETE: 'text-red-600',
        SEARCH: 'text-purple-600',
        EXPORT: 'text-orange-600',
        LOGIN: 'text-indigo-600',
        LOGOUT: 'text-gray-600'
      };
      return colors[operation as keyof typeof colors] || 'text-gray-600';
    };

    const formatTime = (timestamp: Date) => {
      const now = new Date();
      const diff = now.getTime() - timestamp.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    };

    return (
      <div className="flex items-center space-x-3 py-2">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">
              {log.userName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{log.userName}</span>
            <span className={`ml-1 ${getOperationColor(log.operation)}`}>
              {log.operation.toLowerCase()}ed
            </span>
            {log.tableName && (
              <span className="text-gray-600"> in {log.tableName}</span>
            )}
          </p>
          <p className="text-xs text-gray-500">{formatTime(log.timestamp)}</p>
        </div>
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOperationColor(log.operation)} bg-gray-100`}>
            {log.operation}
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.username}!</h2>
            <p className="text-gray-600 mt-1">Here's what's happening with your system today.</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-blue-500"
          description="All registered users"
        />
        <StatCard
          title="Active Users"
          value={activeUsers}
          icon={<UserCheck className="w-6 h-6 text-white" />}
          color="bg-green-500"
          description="Currently active users"
        />
        <StatCard
          title="Admin Users"
          value={adminUsers}
          icon={<Shield className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          description="Users with admin privileges"
        />
        <StatCard
          title="Total Activities"
          value={auditStats?.totalLogs || 0}
          icon={<Activity className="w-6 h-6 text-white" />}
          color="bg-orange-500"
          description="System activities logged"
        />
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((log, index) => (
                  <ActivityItem key={index} log={log} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Operation Statistics */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Operation Statistics</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {auditStats?.operations ? (
              <div className="space-y-4">
                {Object.entries(auditStats.operations).map(([operation, count]) => (
                  <div key={operation} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium text-gray-900">{operation}</span>
                    </div>
                    <span className="text-sm text-gray-600">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No operation data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">System Health</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-green-600 font-medium">Healthy</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="text-sm font-medium text-gray-900">Database</h4>
              <p className="text-xs text-green-600 mt-1">Connected</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-sm font-medium text-gray-900">Audit Logging</h4>
              <p className="text-xs text-blue-600 mt-1">Active</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="text-sm font-medium text-gray-900">Security</h4>
              <p className="text-xs text-purple-600 mt-1">Protected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
