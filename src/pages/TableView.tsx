import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {tableConfig.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage {tableConfig.name.toLowerCase()} data
          </p>
        </div>
        
        <div className="flex items-center gap-3">
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
          <Button onClick={() => setShowAddModal(true)} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Employee Commission Specific Filters */}
      {activeTable === 'employee_commissions_DC' && (
        <div className="space-y-4">
          <EmployeeCommissionFilters
            filters={employeeFilters}
            onFilterChange={handleEmployeeFilterChange}
            onClearFilters={handleClearEmployeeFilters}
            employeeNames={employeeNames}
          />
          {!useGroupedView && (
            <div className="flex justify-end">
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
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
      </div>

      {/* Data Table */}
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
