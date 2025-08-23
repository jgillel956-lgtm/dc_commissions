import React, { useState } from 'react';
import { Search, Filter, Edit, Trash2, UserPlus, Users } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import UserForm from '../forms/UserForm';
import { useUserManagement } from '../../hooks/useUserManagement';
import { useToast } from '../../contexts/ToastContext';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { showError } = useToast();
  
  // Use the user management hook
  const {
    users,
    isLoading,
    createUser,
    updateUser,
    changeUserStatus,
    isCreating,
    isUpdating
  } = useUserManagement();



  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleCreateUserSubmit = async (userData: Partial<User> & { password?: string }) => {
    try {
      await createUser({
        username: userData.username!,
        password: userData.password!,
        role: userData.role!,
        status: userData.status!
      });
      setShowCreateModal(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleEditUserSubmit = async (userData: Partial<User> & { password?: string }) => {
    if (!selectedUser) return;
    
    try {
      // Prevent admin from demoting themselves
      if (selectedUser.username === 'admin' && userData.role === 'user') {
        showError('Role Change Denied', 'You cannot change the admin user to a regular user role.');
        return;
      }
      
      await updateUser(selectedUser.id, {
        username: userData.username,
        password: userData.password,
        role: userData.role,
        status: userData.status
      });
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDeleteUser = async (user: User) => {
    // Prevent admin from deactivating themselves
    if (user.username === 'admin') {
      showError('Status Change Denied', 'You cannot change the status of the admin user account.');
      return;
    }
    
    const isActivating = user.status === 'inactive';
    const action = isActivating ? 'activate' : 'deactivate';
    const confirmationMessage = `Are you sure you want to ${action} user "${user.username}"?`;
    
    if (window.confirm(confirmationMessage)) {
      try {
        const newStatus = isActivating ? 'active' as const : 'inactive' as const;
        await changeUserStatus(user.id, newStatus);
      } catch (error) {
        // Error handling is done in the hook
      }
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        status === 'active' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {status === 'active' ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        role === 'admin' 
          ? 'bg-purple-100 text-purple-800' 
          : 'bg-blue-100 text-blue-800'
      }`}>
        {role === 'admin' ? 'Admin' : 'User'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage system users, roles, and permissions</p>
        </div>
        <Button
          onClick={handleCreateUser}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as any)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <Select
              value={roleFilter}
              onChange={(value) => setRoleFilter(value as any)}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'user', label: 'User' }
              ]}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setRoleFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Users</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{filteredUsers.length} users</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-gray-600">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                                                 <button
                           onClick={() => handleDeleteUser(user)}
                           className={`p-1 ${
                             user.status === 'active' 
                               ? 'text-red-600 hover:text-red-900' 
                               : 'text-green-600 hover:text-green-900'
                           }`}
                           title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}
                           disabled={user.username === 'admin'}
                         >
                           {user.status === 'active' ? (
                             <Trash2 className="w-4 h-4" />
                           ) : (
                             <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                               <span className="text-white text-xs">✓</span>
                             </div>
                           )}
                         </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredUsers.length === 0 && !isLoading && (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

             {/* Create User Modal */}
       <Modal
         isOpen={showCreateModal}
         onClose={() => setShowCreateModal(false)}
         title="Create New User"
         size="lg"
       >
                   <UserForm
            mode="create"
            onSubmit={handleCreateUserSubmit}
            onCancel={() => setShowCreateModal(false)}
            loading={isCreating}
          />
       </Modal>

       {/* Edit User Modal */}
       <Modal
         isOpen={showEditModal}
         onClose={() => setShowEditModal(false)}
         title="Edit User"
         size="lg"
       >
                   <UserForm
            user={selectedUser}
            mode="edit"
            onSubmit={handleEditUserSubmit}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            loading={isUpdating}
          />
       </Modal>
    </div>
  );
};

export default UserManagement;
