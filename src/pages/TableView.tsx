import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import DataTable from '../components/tables/DataTable';
import GroupedEmployeeTable from '../components/tables/GroupedEmployeeTable';
import AddRecordForm from '../components/forms/AddRecordForm';
import EditRecordForm from '../components/forms/EditRecordForm';
import EmployeeCommissionAddForm from '../components/forms/EmployeeCommissionAddForm';
import AuthIntegrationTest from '../components/AuthIntegrationTest';
import EmployeeCommissionFilters from '../components/filters/EmployeeCommissionFilters';
import { tableConfigs } from '../config/tableConfigs';
import { useZohoData } from '../hooks/useZohoData';
import { useZohoMutations } from '../hooks/useZohoMutations';
import { SearchParams } from '../services/apiTypes';

interface TableViewProps {
  activeTable: string;
}

const TableView: React.FC<TableViewProps> = ({ activeTable }) => {
  // DEBUG: TableView component loading
  console.log('📊 TableView loading for table: ' + activeTable);
  
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<any>(null);
  const [showAuthTest, setShowAuthTest] = useState(false);
  const [useGroupedView, setUseGroupedView] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Employee Commission specific filters
  const [employeeFilters, setEmployeeFilters] = useState({
    employeeName: '',
    paymentMethodId: '',
    companyId: ''
  });

  const tableConfig = tableConfigs[activeTable];
  
  // Build search parameters with filters
  const searchParams: SearchParams = useMemo(() => {
    const params: SearchParams = {
      page: currentPage,
      limit: 50,
      sortBy: sortField,
      sortOrder,
      search: searchQuery,
    };

    // Add employee commission specific filters
    if (activeTable === 'employee_commissions_DC') {
      if (employeeFilters.employeeName) {
        params.filters = {
          ...params.filters,
          employee_name: employeeFilters.employeeName
        };
      }
      if (employeeFilters.paymentMethodId) {
        params.filters = {
          ...params.filters,
          payment_method_id: employeeFilters.paymentMethodId
        };
      }
      if (employeeFilters.companyId) {
        params.filters = {
          ...params.filters,
          company_id: employeeFilters.companyId
        };
      }
    }

    return params;
  }, [currentPage, sortField, sortOrder, searchQuery, activeTable, employeeFilters]);

  // Use the generic data hook for the active table
  const { data, isLoading, error, refetch } = useZohoData(activeTable, searchParams);

  // Use the generic mutation hooks for the active table
  const { create, update, delete: deleteMutation, export: exportMutation } = useZohoMutations(activeTable);

  // Debug logging for DataTable rendering
  useEffect(() => {
    if (data?.data && !useGroupedView) {
      console.log('📋 About to render DataTable with ' + data.data.length + ' records for ' + activeTable);
    }
  }, [data, useGroupedView, activeTable]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  // Handle sort
  const handleSort = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1);
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle employee filter changes
  const handleEmployeeFilterChange = useCallback((filters: any) => {
    setEmployeeFilters(filters);
    setCurrentPage(1);
  }, []);

  // Handle clear employee filters
  const handleClearEmployeeFilters = useCallback(() => {
    setEmployeeFilters({
      employeeName: '',
      paymentMethodId: '',
      companyId: ''
    });
    setCurrentPage(1);
  }, []);

  // Handle add record
  const handleAddRecord = useCallback(async (values: any) => {
    try {
      await create.mutateAsync(values);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding record:', error);
    }
  }, [create]);

  // Handle edit record
  const handleEditRecord = useCallback(async (values: any) => {
    try {
      await update.mutateAsync({ id: editingRecord.id, data: values, oldData: editingRecord });
      setShowEditModal(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
    }
  }, [update, editingRecord]);

  // Handle delete record
  const handleDeleteRecord = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync(deletingRecord.id);
      setShowDeleteConfirm(false);
      setDeletingRecord(null);
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  }, [deleteMutation, deletingRecord]);

  // Handle edit click
  const handleEditClick = useCallback((record: any) => {
    setEditingRecord(record);
    setShowEditModal(true);
  }, []);

  // Handle delete click
  const handleDeleteClick = useCallback((record: any) => {
    setDeletingRecord(record);
    setShowDeleteConfirm(true);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      await exportMutation.mutateAsync({ format: 'csv' });
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }, [exportMutation]);

  // Handle table navigation
  const handleTableChange = useCallback((tableKey: string) => {
    navigate(`/table-view?table=${tableKey}`);
  }, [navigate]);

  const records = data?.data || [];
  const totalPages = data?.total ? Math.ceil(data.total / 50) : 1;

  // Get unique employee names for the dropdown
  const employeeNames = useMemo(() => {
    if (activeTable === 'employee_commissions_DC') {
      const names = new Set<string>();
      records.forEach(record => {
        if (record.employee_name) {
          names.add(record.employee_name);
        }
      });
      return Array.from(names).sort();
    }
    return [];
  }, [records, activeTable]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Data Management
                </h1>
                <p className="text-gray-600">
                  Manage your business data and configurations
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button onClick={handleRefresh} variant="secondary" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleExport} variant="secondary" size="sm">
                Export
              </Button>
              <Button onClick={() => setShowAuthTest(true)} variant="secondary" size="sm">
                Auth Test
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              {!sidebarCollapsed && (
                <h2 className="text-lg font-semibold text-gray-900">Tables</h2>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            
            <nav className="space-y-2">
              {Object.entries(tableConfigs).map(([tableKey, config]) => {
                const Icon = config.icon;
                const isActive = activeTable === tableKey;
                
                return (
                  <button
                    key={tableKey}
                    onClick={() => handleTableChange(tableKey)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">{config.name}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Table Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {tableConfig.name}
                  </h2>
                  <p className="text-gray-600">
                    Manage {tableConfig.name.toLowerCase()} data
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button onClick={() => setShowAddModal(true)} variant="primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Record
                  </Button>
                </div>
              </div>
            </div>

            {/* Employee Commission Specific Filters */}
            {activeTable === 'employee_commissions_DC' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <EmployeeCommissionFilters
                  filters={employeeFilters}
                  onFilterChange={handleEmployeeFilterChange}
                  onClearFilters={handleClearEmployeeFilters}
                  employeeNames={employeeNames}
                />
                {!useGroupedView && (
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={() => setUseGroupedView(true)}
                      variant="secondary"
                      size="sm"
                    >
                      Grouped View
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {activeTable === 'employee_commissions_DC' && useGroupedView ? (
                <GroupedEmployeeTable
                  data={records}
                  tableConfig={tableConfig}
                  loading={isLoading}
                  onSort={handleSort}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onAdd={handleAddRecord}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  onToggleView={() => setUseGroupedView(false)}
                />
              ) : (
                <DataTable
                  data={records}
                  tableConfig={tableConfig}
                  loading={isLoading}
                  onSort={handleSort}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${tableConfig.name} Record`}
        size={activeTable === 'employee_commissions_DC' ? 'xl' : undefined}
      >
        {activeTable === 'employee_commissions_DC' ? (
          <EmployeeCommissionAddForm
            onSubmit={handleAddRecord}
            onCancel={() => setShowAddModal(false)}
            loading={create.isPending}
          />
        ) : (
          <AddRecordForm
            tableConfig={tableConfig}
            onSubmit={handleAddRecord}
            onCancel={() => setShowAddModal(false)}
            loading={create.isPending}
          />
        )}
      </Modal>

      {/* Edit Record Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRecord(null);
        }}
        title={`Edit ${tableConfig.name} Record`}
      >
        <EditRecordForm
          tableConfig={tableConfig}
          record={editingRecord}
          onSubmit={handleEditRecord}
          onCancel={() => {
            setShowEditModal(false);
            setEditingRecord(null);
          }}
          loading={update.isPending}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingRecord(null);
        }}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p>Are you sure you want to delete this record? This action cannot be undone.</p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingRecord(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteRecord}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auth Test Modal */}
      <Modal
        isOpen={showAuthTest}
        onClose={() => setShowAuthTest(false)}
        title="Authentication Test"
      >
        <AuthIntegrationTest />
      </Modal>
    </div>
  );
};

export default TableView;
