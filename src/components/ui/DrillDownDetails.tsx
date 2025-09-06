import React from 'react';
import { X, Info, TrendingUp, TrendingDown, DollarSign, Users, Calendar } from 'lucide-react';
import { DrillDownNode } from '../../hooks/useDrillDown';

export interface DrillDownDetailsProps {
  node: DrillDownNode | null;
  onClose: () => void;
  className?: string;
  showMetadata?: boolean;
  showStatistics?: boolean;
  showChildren?: boolean;
  maxChildren?: number;
  formatValue?: (value: number) => string;
  formatPercentage?: (value: number, total: number) => string;
}

const DrillDownDetails: React.FC<DrillDownDetailsProps> = ({
  node,
  onClose,
  className = '',
  showMetadata = true,
  showStatistics = true,
  showChildren = true,
  maxChildren = 10,
  formatValue = (value) => `$${value.toLocaleString()}`,
  formatPercentage = (value, total) => `${((value / total) * 100).toFixed(1)}%`
}) => {
  if (!node) {
    return null;
  }

  const hasChildren = node.children && node.children.length > 0;
  const hasMetadata = node.metadata && Object.keys(node.metadata).length > 0;
  const totalValue = node.children?.reduce((sum, child) => sum + child.value, 0) || node.value;

  const getTrendIcon = (value: number, previousValue?: number) => {
    if (!previousValue) return null;
    if (value > previousValue) {
      return <TrendingUp className="text-green-500" size={16} />;
    } else if (value < previousValue) {
      return <TrendingDown className="text-red-500" size={16} />;
    }
    return null;
  };

  const getMetadataIcon = (key: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      date: <Calendar size={14} />,
      users: <Users size={14} />,
      revenue: <DollarSign size={14} />,
      growth: <TrendingUp size={14} />,
      decline: <TrendingDown size={14} />,
    };
    return iconMap[key.toLowerCase()] || <Info size={14} />;
  };

  return (
    <div className={`drill-down-details bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <h3 className="text-lg font-semibold text-gray-900">{node.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close details"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Main Value */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {formatValue(node.value)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {node.level === 0 ? 'Total Value' : 'Segment Value'}
          </div>
        </div>

        {/* Statistics */}
        {showStatistics && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-500">Level</div>
              <div className="text-lg font-semibold text-gray-900">{node.level}</div>
            </div>
            {hasChildren && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">Children</div>
                <div className="text-lg font-semibold text-gray-900">{node.children!.length}</div>
              </div>
            )}
            {node.metadata?.previousValue && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">Previous</div>
                <div className="text-lg font-semibold text-gray-900 flex items-center space-x-1">
                  <span>{formatValue(node.metadata.previousValue)}</span>
                  {getTrendIcon(node.value, node.metadata.previousValue)}
                </div>
              </div>
            )}
            {node.metadata?.percentage && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">Share</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatPercentage(node.value, totalValue)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {showMetadata && hasMetadata && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Additional Information</h4>
            <div className="space-y-2">
              {Object.entries(node.metadata!).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    {getMetadataIcon(key)}
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                  <div className="text-gray-900 font-medium">
                    {typeof value === 'number' ? formatValue(value) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Children Preview */}
        {showChildren && hasChildren && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Sub-segments ({node.children!.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {node.children!.slice(0, maxChildren).map((child, index) => (
                <div key={child.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: `hsl(${(index * 30) % 360}, 70%, 50%)` }}
                    ></div>
                    <span className="text-gray-700">{child.name}</span>
                  </div>
                  <div className="text-gray-900 font-medium">
                    {formatValue(child.value)}
                  </div>
                </div>
              ))}
              {node.children!.length > maxChildren && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{node.children!.length - maxChildren} more items
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t border-gray-200">
          {hasChildren && (
            <button className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors">
              Drill Down
            </button>
          )}
          <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded transition-colors">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrillDownDetails;





