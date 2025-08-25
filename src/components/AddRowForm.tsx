import React, { useState } from 'react';
import { useAddRow } from '../hooks/useAddRow';

interface AddRowFormProps {
  onRowAdded?: () => void;
  className?: string;
}

export function AddRowForm({ onRowAdded, className = '' }: AddRowFormProps) {
  const { loading, error, success, addRow, reset } = useAddRow();
  const [formData, setFormData] = useState({
    employee_name: '',
    commission_amount: '',
    commission_date: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addRow({
        ...formData,
        commission_amount: parseFloat(formData.commission_amount) || 0
      });
      
      // Reset form on success
      setFormData({
        employee_name: '',
        commission_amount: '',
        commission_date: '',
        notes: ''
      });
      
      if (onRowAdded) {
        onRowAdded();
      }
    } catch (err) {
      // Error is already handled by the hook
      console.error('Failed to add row:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className={`add-row-form ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Add Employee Commission</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="employee_name" className="block text-sm font-medium text-gray-700">
            Employee Name
          </label>
          <input
            type="text"
            id="employee_name"
            name="employee_name"
            value={formData.employee_name}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="commission_amount" className="block text-sm font-medium text-gray-700">
            Commission Amount
          </label>
          <input
            type="number"
            id="commission_amount"
            name="commission_amount"
            value={formData.commission_amount}
            onChange={handleChange}
            required
            step="0.01"
            min="0"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="commission_date" className="block text-sm font-medium text-gray-700">
            Commission Date
          </label>
          <input
            type="date"
            id="commission_date"
            name="commission_date"
            value={formData.commission_date}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Commission'}
          </button>
          
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
          ✅ Commission added successfully!
        </div>
      )}
    </div>
  );
}

