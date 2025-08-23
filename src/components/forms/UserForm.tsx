import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useToast } from '../../contexts/ToastContext';

interface UserData {
  id?: number;
  username: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  createdAt?: string;
  lastLogin?: string;
}

interface UserFormProps {
  user?: UserData | null;
  mode: 'create' | 'edit';
  onSubmit: (userData: Partial<UserData> & { password?: string }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
}

interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  status?: string;
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  mode,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    status: 'active'
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
  }>({ score: 0, feedback: [] });
  
  const { showError } = useToast();

  // Initialize form data when editing
  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        username: user.username,
        password: '',
        confirmPassword: '',
        role: user.role,
        status: user.status
      });
    }
  }, [user, mode]);

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include lowercase letter');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include uppercase letter');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include number');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include special character');
    }

    return { score, feedback };
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Check password strength
    if (field === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation (only for create mode or when password is provided in edit mode)
    if (mode === 'create' || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (passwordStrength.score < 3) {
        newErrors.password = 'Password is too weak';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    // Status validation
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Validation Error', 'Please fix the errors in the form.');
      return;
    }

    try {
      const userData: Partial<UserData> & { password?: string } = {
        username: formData.username.trim(),
        role: formData.role,
        status: formData.status
      };

      // Only include password if it's provided
      if (formData.password) {
        userData.password = formData.password;
      }

      await onSubmit(userData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score >= 4) return 'text-green-600';
    if (passwordStrength.score >= 3) return 'text-yellow-600';
    if (passwordStrength.score >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score >= 4) return 'Strong';
    if (passwordStrength.score >= 3) return 'Good';
    if (passwordStrength.score >= 2) return 'Fair';
    return 'Weak';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Username Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Username <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Enter username"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            className={`pl-10 ${errors.username ? 'border-red-300' : ''}`}
            disabled={loading}
          />
        </div>
        {errors.username && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.username}
          </p>
        )}
      </div>

      {/* Password Field */}
      {(mode === 'create' || formData.password) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password {mode === 'create' && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'create' ? 'Enter password' : 'Enter new password (leave blank to keep current)'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`pl-10 pr-10 ${errors.password ? 'border-red-300' : ''}`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 w-8 rounded-full ${
                        level <= passwordStrength.score
                          ? getPasswordStrengthColor().replace('text-', 'bg-')
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-sm font-medium ${getPasswordStrengthColor()}`}>
                  {getPasswordStrengthText()}
                </span>
              </div>
              
              {/* Password Requirements */}
              {passwordStrength.feedback.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordStrength.feedback.map((requirement, index) => (
                    <p key={index} className="text-xs text-gray-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {requirement}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.password}
            </p>
          )}
        </div>
      )}

      {/* Confirm Password Field */}
      {(mode === 'create' || formData.password) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-300' : ''}`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.confirmPassword}
            </p>
          )}
        </div>
      )}

      {/* Role Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role <span className="text-red-500">*</span>
        </label>
        <Select
          value={formData.role}
          onChange={(value) => handleInputChange('role', value)}
          options={[
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' }
          ]}
          disabled={loading}
        />
        {errors.role && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.role}
          </p>
        )}
      </div>

      {/* Status Field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status <span className="text-red-500">*</span>
        </label>
        <Select
          value={formData.status}
          onChange={(value) => handleInputChange('status', value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
          disabled={loading}
        />
        {errors.status && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.status}
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={loading}
        >
          {mode === 'create' ? 'Create User' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
