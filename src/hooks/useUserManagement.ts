import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

interface CreateUserData {
  username: string;
  password: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
}

interface UpdateUserData {
  username?: string;
  password?: string;
  role?: 'admin' | 'user';
  status?: 'active' | 'inactive';
}

// Mock API functions for development
const mockUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    username: 'user1',
    role: 'user',
    status: 'active',
    createdAt: '2024-01-02T00:00:00Z',
    lastLogin: '2024-01-14T15:45:00Z'
  },
  {
    id: 3,
    username: 'user2',
    role: 'user',
    status: 'inactive',
    createdAt: '2024-01-03T00:00:00Z',
    lastLogin: '2024-01-10T09:20:00Z'
  }
];

// Mock API functions
const fetchUsers = async (): Promise<User[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return [...mockUsers];
};

const createUser = async (userData: CreateUserData): Promise<User> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if username already exists
  if (mockUsers.some(user => user.username === userData.username)) {
    throw new Error('Username already exists');
  }
  
  const newUser: User = {
    id: Math.max(...mockUsers.map(u => u.id)) + 1,
    username: userData.username,
    role: userData.role,
    status: userData.status,
    createdAt: new Date().toISOString(),
    lastLogin: undefined
  };
  
  mockUsers.push(newUser);
  return newUser;
};

const updateUser = async (id: number, userData: UpdateUserData): Promise<User> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const userIndex = mockUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // Check if username already exists (if changing username)
  if (userData.username && userData.username !== mockUsers[userIndex].username) {
    if (mockUsers.some(user => user.username === userData.username)) {
      throw new Error('Username already exists');
    }
  }
  
  const updatedUser = {
    ...mockUsers[userIndex],
    ...userData
  };
  
  mockUsers[userIndex] = updatedUser;
  return updatedUser;
};

const changeUserStatus = async (id: number, status: 'active' | 'inactive'): Promise<User> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const userIndex = mockUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // Prevent admin deactivation
  if (mockUsers[userIndex].username === 'admin' && status === 'inactive') {
    throw new Error('Cannot deactivate admin user');
  }
  
  const updatedUser = {
    ...mockUsers[userIndex],
    status
  };
  
  mockUsers[userIndex] = updatedUser;
  return updatedUser;
};

// React Query keys
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

export const useUsers = () => {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: (newUser) => {
      // Update the users list cache
      queryClient.setQueryData(userKeys.lists(), (oldData: User[] | undefined) => {
        return oldData ? [...oldData, newUser] : [newUser];
      });
      
      showSuccess('User Created', `User "${newUser.username}" has been created successfully.`);
    },
    onError: (error: Error) => {
      showError('Creation Failed', error.message || 'Failed to create user. Please try again.');
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return useMutation({
    mutationFn: ({ id, userData }: { id: number; userData: UpdateUserData }) =>
      updateUser(id, userData),
    onSuccess: (updatedUser) => {
      // Update the users list cache
      queryClient.setQueryData(userKeys.lists(), (oldData: User[] | undefined) => {
        return oldData?.map(user => 
          user.id === updatedUser.id ? updatedUser : user
        ) || [];
      });
      
      // Update individual user cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
      
      showSuccess('User Updated', `User "${updatedUser.username}" has been updated successfully.`);
    },
    onError: (error: Error) => {
      showError('Update Failed', error.message || 'Failed to update user. Please try again.');
    },
  });
};

export const useChangeUserStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'inactive' }) =>
      changeUserStatus(id, status),
    onSuccess: (updatedUser) => {
      // Update the users list cache
      queryClient.setQueryData(userKeys.lists(), (oldData: User[] | undefined) => {
        return oldData?.map(user => 
          user.id === updatedUser.id ? updatedUser : user
        ) || [];
      });
      
      // Update individual user cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
      
      const action = updatedUser.status === 'active' ? 'activated' : 'deactivated';
      showSuccess('Status Changed', `User "${updatedUser.username}" has been ${action} successfully.`);
    },
    onError: (error: Error) => {
      showError('Status Change Failed', error.message || 'Failed to change user status. Please try again.');
    },
  });
};

// Custom hook for user management operations
export const useUserManagement = () => {
  const { data: users, isLoading, error, refetch } = useUsers();
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const changeStatusMutation = useChangeUserStatus();
  
  const createUser = useCallback(async (userData: CreateUserData) => {
    return createUserMutation.mutateAsync(userData);
  }, [createUserMutation]);
  
  const updateUser = useCallback(async (id: number, userData: UpdateUserData) => {
    return updateUserMutation.mutateAsync({ id, userData });
  }, [updateUserMutation]);
  
  const changeUserStatus = useCallback(async (id: number, status: 'active' | 'inactive') => {
    return changeStatusMutation.mutateAsync({ id, status });
  }, [changeStatusMutation]);
  
  return {
    // Data
    users: users || [],
    isLoading,
    error,
    
    // Mutations
    createUser,
    updateUser,
    changeUserStatus,
    
    // Loading states
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isChangingStatus: changeStatusMutation.isPending,
    
    // Refetch
    refetch,
  };
};
