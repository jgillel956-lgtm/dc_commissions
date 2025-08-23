import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import DataTable from '../components/tables/DataTable';
import AddRecordForm from '../components/forms/AddRecordForm';
import EditRecordForm from '../components/forms/EditRecordForm';
import AuthIntegrationTest from '../components/AuthIntegrationTest';
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

  const tableConfig = tableConfigs[activeTable];
  
  // Build search parameters
  const searchParams: SearchParams = useMemo(() => ({
    page: currentPage,
    limit: 50,
    sortBy: sortField,
    sortOrder,
    query: searchQuery,
  }), [currentPage, sortField, sortOrder, searchQuery]);

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
    if (!editingRecord) return;
    
    try {
      await update.mutateAsync({ 
        id: editingRecord.id, 
        data: values,
        oldData: editingRecord // Pass old data for audit logging
      });
      setShowEditModal(false);
      setEditingRecord(null);
    } catch (error) {
      console.error('Error updating record:', error);
    }
  }, [update, editingRecord]);

  // Handle delete record
  const handleDeleteRecord = useCallback(async () => {
    if (!deletingRecord) return;
    
    try {
      await deleteMutation.mutateAsync({ 
        id: deletingRecord.id,
        deletedData: deletingRecord // Pass deleted data for audit logging
      });
      setShowDeleteConfirm(false);
      setDeletingRecord(null);
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  }, [deleteMutation, deletingRecord]);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const blob = await exportMutation.mutateAsync({ format: 'csv', params: searchParams });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTable}-export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  }, [exportMutation, searchParams, activeTable]);

  // Handle edit button click
  const handleEditClick = useCallback((record: any) => {
    setEditingRecord(record);
    setShowEditModal(true);
  }, []);

  // Handle delete button click
  const handleDeleteClick = useCallback((record: any) => {
    setDeletingRecord(record);
    setShowDeleteConfirm(true);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
          <p className="text-red-600 mb-4">{(error as any).message}</p>
          <Button onClick={handleRefresh} variant="primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  // Show no table config error
  if (!tableConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Table Not Found</h3>
          <p className="text-yellow-600">No configuration found for table: {activeTable}</p>
        </div>
      </div>
    );
  }

  const records = data?.data || [];
  const totalPages = data?.total ? Math.ceil(data.total / 50) : 1;

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
      <DataTable
        data={records}
        tableConfig={tableConfig}
        onSort={handleSort}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Add Record Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${tableConfig.name} Record`}
      >
                  <AddRecordForm
            tableConfig={tableConfig}
            onSubmit={handleAddRecord}
            onCancel={() => setShowAddModal(false)}
            loading={create.isPending}
          />
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
        {editingRecord && (
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
        )}
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
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this record? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingRecord(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
                          <Button
                onClick={handleDeleteRecord}
                variant="danger"
                loading={deleteMutation.isPending}
              >
                Delete
              </Button>
          </div>
        </div>
      </Modal>

      {/* Auth Integration Test Modal */}
      <Modal
        isOpen={showAuthTest}
        onClose={() => setShowAuthTest(false)}
        title="Auth Integration Test"
      >
        <AuthIntegrationTest />
      </Modal>
    </div>
  );
};

export default TableView;
