import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import { Plus, Users, CreditCard, Building } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';
import { useLookupData } from '../../hooks/useZohoData';
import { employeeCommissionSchema } from '../../config/tableConfigs';

interface EmployeeCommissionAddCompanyFormProps {
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  employeeName: string;
  employeeId: number;
  existingRecords?: any[]; // Existing commission records for this employee
}

const EmployeeCommissionAddCompanyForm: React.FC<EmployeeCommissionAddCompanyFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
  employeeName,
  employeeId,
  existingRecords = []
}) => {
  const [bulkCreate, setBulkCreate] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
  
  const lookupData = useLookupData('employee_commissions_DC');
  
  // Get existing active combinations to pre-check them
  const getExistingCombinations = () => {
    const combinations = new Set<string>();
    existingRecords.forEach(record => {
      if (record.active) {
        combinations.add(`${record.company_id}_${record.payment_method_id}`);
      }
    });
    return combinations;
  };

  const existingCombinations = getExistingCombinations();
  
  // Initialize selected companies and payment methods based on existing active records
  const initializeSelectedItems = () => {
    const activeCompanies = new Set<string>();
    const activePaymentMethods = new Set<string>();
    
    existingRecords.forEach(record => {
      if (record.active) {
        activeCompanies.add(record.company_id?.toString());
        activePaymentMethods.add(record.payment_method_id?.toString());
      }
    });
    
    return {
      companies: Array.from(activeCompanies).filter(Boolean),
      paymentMethods: Array.from(activePaymentMethods).filter(Boolean)
    };
  };
  
  // Initialize selected items when component mounts or existingRecords changes
  React.useEffect(() => {
    const { companies, paymentMethods } = initializeSelectedItems();
    setSelectedCompanies(companies);
    setSelectedModalities(paymentMethods);
  }, [existingRecords]);
  
  const formik = useFormik({
    initialValues: {
      employee_name: employeeName,
      employee_id: employeeId,
      payment_method_id: '',
      company_id: '',
      commission_percentage: '',
      effective_start_date: '',
      description: '',
      active: true
    },
    validationSchema: employeeCommissionSchema,
    onSubmit: async (values: any) => {
      try {
        console.log('Form submitted with values:', values);
        console.log('Form validation errors:', formik.errors);
        console.log('Form touched fields:', formik.touched);
        
        if (bulkCreate && selectedCompanies.length > 0 && selectedModalities.length > 0) {
          // Create multiple records for bulk creation
          const records = [];
          for (const companyId of selectedCompanies) {
            for (const modalityId of selectedModalities) {
              // Skip if this combination already exists and is active
              const combinationKey = `${companyId}_${modalityId}`;
              if (!existingCombinations.has(combinationKey)) {
                records.push({
                  ...values,
                  payment_method_id: modalityId,
                  company_id: companyId,
                  commission_percentage: values.commission_percentage
                });
              }
            }
          }
          
          console.log('Creating bulk records:', records);
          
          // Submit all records
          for (const record of records) {
            await onSubmit(record);
          }
        } else {
          // Single record creation
          console.log('Creating single record:', values);
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

  const handleSelectAllCompanies = (checked: boolean) => {
    if (checked) {
      setSelectedCompanies(companiesToShow.map((company: any) => company.id.toString()) || []);
    } else {
      setSelectedCompanies([]);
    }
  };

  const handleSelectAllModalities = (checked: boolean) => {
    if (checked) {
      setSelectedModalities(paymentMethodsToShow.map((method: any) => method.id.toString()) || []);
    } else {
      setSelectedModalities([]);
    }
  };

  // Check if a combination already exists and is active
  const isCombinationActive = (companyId: string, modalityId: string) => {
    return existingCombinations.has(`${companyId}_${modalityId}`);
  };

  // Get companies to show - if there are existing records, show all companies, otherwise show only available ones
  const getCompaniesToShow = () => {
    if (existingRecords.length > 0) {
      return lookupData.companies || [];
    }
    return lookupData.companies?.filter((company: any) => {
      const companyId = company.id.toString();
      const hasActiveForAllModalities = lookupData.paymentMethods?.every((method: any) => 
        isCombinationActive(companyId, method.id.toString())
      );
      return !hasActiveForAllModalities;
    }) || [];
  };

  // Get payment methods to show - if there are existing records, show all payment methods, otherwise show only available ones
  const getPaymentMethodsToShow = () => {
    if (existingRecords.length > 0) {
      return lookupData.paymentMethods || [];
    }
    return lookupData.paymentMethods?.filter((method: any) => {
      const methodId = method.id.toString();
      const hasActiveForAllCompanies = lookupData.companies?.every((company: any) => 
        isCombinationActive(company.id.toString(), methodId)
      );
      return !hasActiveForAllCompanies;
    }) || [];
  };

  const companiesToShow = getCompaniesToShow();
  const paymentMethodsToShow = getPaymentMethodsToShow();

  const previewRecords = selectedCompanies.length * selectedModalities.length;
  const canCreate = !bulkCreate || (selectedCompanies.length > 0 && selectedModalities.length > 0);

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Employee Information (Read-only) */}
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
            disabled
            className="bg-gray-50"
          />
          
          <Input
            id="employee_id"
            name="employee_id"
            type="number"
            label="Employee ID"
            value={formik.values.employee_id}
            disabled
            className="bg-gray-50"
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
              Each combination will create a separate record. Already active combinations will be skipped.
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
               options={paymentMethodsToShow.map((method: any) => ({
                 value: method.id.toString(),
                 label: method.payment_method
               }))}
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
               options={companiesToShow.map((company: any) => ({
                 value: company.id.toString(),
                 label: company.company
               }))}
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
            
                         {/* Select All Companies */}
             <div className="border-b border-gray-200 pb-2">
               <label className="flex items-center space-x-2 cursor-pointer">
                 <input
                   type="checkbox"
                   checked={selectedCompanies.length === companiesToShow.length && selectedCompanies.length > 0}
                   onChange={(e) => handleSelectAllCompanies(e.target.checked)}
                   className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                 />
                 <span className="text-sm font-medium text-gray-700">Select All Companies</span>
               </label>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto">
               {companiesToShow.map((company: any) => (
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
            
                         {/* Select All Payment Methods */}
             <div className="border-b border-gray-200 pb-2">
               <label className="flex items-center space-x-2 cursor-pointer">
                 <input
                   type="checkbox"
                   checked={selectedModalities.length === paymentMethodsToShow.length && selectedModalities.length > 0}
                   onChange={(e) => handleSelectAllModalities(e.target.checked)}
                   className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                 />
                 <span className="text-sm font-medium text-gray-700">Select All Payment Methods</span>
               </label>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-32 overflow-y-auto">
               {paymentMethodsToShow.map((method: any) => (
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

        <Input
          id="description"
          name="description"
          type="text"
          label="Description"
          value={formik.values.description}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.description && formik.errors.description ? String(formik.errors.description) : undefined}
          placeholder="Enter description"
          required
        />

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

export default EmployeeCommissionAddCompanyForm;
