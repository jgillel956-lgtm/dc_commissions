import React from 'react';
import { Filter, X } from 'lucide-react';
import Input from '../ui/Input';
import SearchableSelect from '../ui/SearchableSelect';
import Button from '../ui/Button';
import { useLookupData } from '../../hooks/useZohoData';

interface EmployeeCommissionFiltersProps {
  filters: {
    employeeName: string;
    paymentMethodId: string;
    companyId: string;
  };
  onFilterChange: (filters: {
    employeeName: string;
    paymentMethodId: string;
    companyId: string;
  }) => void;
  onClearFilters: () => void;
  employeeNames?: string[];
}

const EmployeeCommissionFilters: React.FC<EmployeeCommissionFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  employeeNames = []
}) => {
  const lookupData = useLookupData('employee_commissions_DC');
  
  const handleFilterChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = filters.employeeName || filters.paymentMethodId || filters.companyId;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button
            onClick={onClearFilters}
            variant="secondary"
            size="sm"
            className="flex items-center space-x-1"
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Employee Name Filter */}
        <div>
          <SearchableSelect
            value={filters.employeeName}
            onChange={(value) => handleFilterChange('employeeName', value)}
            options={[
              { value: '', label: 'All Employees' },
              ...employeeNames.map((name) => ({
                value: name,
                label: name
              }))
            ]}
            placeholder="Select employee"
          />
        </div>

        {/* Payment Method Filter */}
        <div>
          <SearchableSelect
            value={filters.paymentMethodId}
            onChange={(value) => handleFilterChange('paymentMethodId', value)}
            options={[
              { value: '', label: 'All Payment Methods' },
              ...(lookupData.paymentMethods?.map((method: any) => ({
                value: method.id.toString(),
                label: method.payment_method
              })) || [])
            ]}
            placeholder="Select payment method"
          />
        </div>

        {/* Company Filter */}
        <div>
          <SearchableSelect
            value={filters.companyId}
            onChange={(value) => handleFilterChange('companyId', value)}
            options={[
              { value: '', label: 'All Companies' },
              ...(lookupData.companies?.map((company: any) => ({
                value: company.id.toString(),
                label: company.company
              })) || [])
            ]}
            placeholder="Select company"
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          {filters.employeeName && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Employee: {filters.employeeName}
            </span>
          )}
          {filters.paymentMethodId && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Payment Method: {lookupData.paymentMethods?.find((m: any) => m.id.toString() === filters.paymentMethodId)?.payment_method}
            </span>
          )}
          {filters.companyId && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              Company: {lookupData.companies?.find((c: any) => c.id.toString() === filters.companyId)?.company}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeCommissionFilters;
