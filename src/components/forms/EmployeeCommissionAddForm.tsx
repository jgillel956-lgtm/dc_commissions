import React, { useState } from 'react';
import { useFormik } from 'formik';
import { Plus, Users, CreditCard, Building } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';
import { useLookupData } from '../../hooks/useZohoData';
import { employeeCommissionSchema } from '../../config/tableConfigs';

interface EmployeeCommissionAddFormProps {
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const EmployeeCommissionAddForm: React.FC<EmployeeCommissionAddFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [bulkCreate, setBulkCreate] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const lookupData = useLookupData('employee_commissions_DC');
  
  const formik = useFormik({
    initialValues: {
      employee_name: '',
      employee_id: Math.floor(Math.random() * 1000) + 100,
      payment_method_id: '',
      company_id: '',
      commission_percentage: '',
      effective_start_date: '',
      active: true
    },
    validationSchema: employeeCommissionSchema,
    onSubmit: async (values: any) => {
      try {
        if (bulkCreate && selectedCompanies.length > 0 && selectedModalities.length > 0) {
          // Create multiple records for bulk creation
          const records = [];
          for (const companyId of selectedCompanies) {
            for (const modalityId of selectedModalities) {
              records.push({
                ...values,
                payment_method_id: modalityId,
                company_id: companyId,
                commission_percentage: values.commission_percentage
              });
            }
          }
          
          // Submit all records
          for (const record of records) {
            await onSubmit(record);
          }
        } else {
          // Single record creation
          await onSubmit(values);
        }
        formik.resetForm();
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    },
  });

  const handleBulkCreateToggle = (checked: boolean) => {
    setBulkCreate(checked);
    if (!checked) {
      setSelectedCompanies([]);
      setSelectedModalities([]);
      setShowPreview(false);
    }
  };

  const handleCompanySelection = (companyId: string, checked: boolean) => {
    if (checked) {
      setSelectedCompanies(prev => [...prev, companyId]);
    } else {
      setSelectedCompanies(prev => prev.filter(id => id !== companyId));
    }
  };

  const handleModalitySelection = (modalityId: string, checked: boolean) => {
    if (checked) {
      setSelectedModalities(prev => [...prev, modalityId]);
    } else {
      setSelectedModalities(prev => prev.filter(id => id !== modalityId));
    }
  };

  const previewRecords = selectedCompanies.length * selectedModalities.length;
  const canCreate = !bulkCreate || (selectedCompanies.length > 0 && selectedModalities.length > 0);

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      {/* Basic Employee Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Employee Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="employee_name"
            name="employee_name"
            type="text"
            label="Employee Name"
            value={formik.values.employee_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.employee_name && formik.errors.employee_name ? String(formik.errors.employee_name) : undefined}
            placeholder="Enter employee name"
            required
          />
          
          <Input
            id="employee_id"
            name="employee_id"
            type="number"
            label="Employee ID"
            value={formik.values.employee_id}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.employee_id && formik.errors.employee_id ? String(formik.errors.employee_id) : undefined}
            placeholder="Auto-generated"
            disabled
          />
        </div>
      </div>

      {/* Bulk Creation Toggle */}
      <div className="space-y-4">
        <Toggle
          id="bulk_create"
          name="bulk_create"
          checked={bulkCreate}
          onChange={handleBulkCreateToggle}
          label="Create commission records for all payment modalities"
        />
        
        {bulkCreate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This will create commission records for the selected companies and payment methods.
              Each combination will create a separate record.
            </p>
          </div>
        )}
      </div>

      {/* Single Record Fields (when not bulk creating) */}
      {!bulkCreate && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Commission Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="payment_method_id"
              name="payment_method_id"
              label="Payment Method"
              value={formik.values.payment_method_id}
              onChange={(value) => formik.setFieldValue('payment_method_id', value)}
              onBlur={() => formik.handleBlur({ target: { name: 'payment_method_id' } })}
              error={formik.touched.payment_method_id && formik.errors.payment_method_id ? String(formik.errors.payment_method_id) : undefined}
              options={lookupData.paymentMethods?.map((method: any) => ({
                value: method.id.toString(),
                label: method.payment_method
              })) || []}
              placeholder="Select payment method"
              required
            />
            
            <Select
              id="company_id"
              name="company_id"
              label="Company"
              value={formik.values.company_id}
              onChange={(value) => formik.setFieldValue('company_id', value)}
              onBlur={() => formik.handleBlur({ target: { name: 'company_id' } })}
              error={formik.touched.company_id && formik.errors.company_id ? String(formik.errors.company_id) : undefined}
              options={lookupData.companies?.map((company: any) => ({
                value: company.id.toString(),
                label: company.company
              })) || []}
              placeholder="Select company"
              required
            />
          </div>
        </div>
      )}

      {/* Bulk Selection Fields */}
      {bulkCreate && (
        <div className="space-y-6">
          {/* Company Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Select Companies
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {lookupData.companies?.map((company: any) => (
                <label key={company.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCompanies.includes(company.id.toString())}
                    onChange={(e) => handleCompanySelection(company.id.toString(), e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{company.company}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Select Payment Methods
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {lookupData.paymentMethods?.map((method: any) => (
                <label key={method.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModalities.includes(method.id.toString())}
                    onChange={(e) => handleModalitySelection(method.id.toString(), e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{method.payment_method}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          {previewRecords > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Preview:</strong> This will create {previewRecords} commission record(s):
                {selectedCompanies.length} companies × {selectedModalities.length} payment methods
              </p>
            </div>
          )}
        </div>
      )}

      {/* Commission Rate and Dates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Commission Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="commission_percentage"
            name="commission_percentage"
            type="number"
            label="Commission Percentage"
            value={formik.values.commission_percentage}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.commission_percentage && formik.errors.commission_percentage ? String(formik.errors.commission_percentage) : undefined}
            placeholder="0.0"
            min="0"
            max="100"
            step="0.1"
            required
          />
          
          <Input
            id="effective_start_date"
            name="effective_start_date"
            type="date"
            label="Effective Start Date"
            value={formik.values.effective_start_date}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.effective_start_date && formik.errors.effective_start_date ? String(formik.errors.effective_start_date) : undefined}
            required
          />
        </div>

        <Toggle
          id="active"
          name="active"
          checked={formik.values.active}
          onChange={(checked) => formik.setFieldValue('active', checked)}
          onBlur={() => formik.handleBlur({ target: { name: 'active' } })}
          label="Active"
          error={formik.touched.active && formik.errors.active ? String(formik.errors.active) : undefined}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
          disabled={loading || !canCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          {bulkCreate ? `Create ${previewRecords} Records` : 'Create Record'}
        </Button>
      </div>
    </form>
  );
};

export default EmployeeCommissionAddForm;
