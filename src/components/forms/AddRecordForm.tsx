import React, { useState, useCallback } from 'react';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { Plus, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';
import { TableConfig, FieldConfig } from '../../config/tableConfigs';
import { validationSchemas } from '../../config/tableConfigs';
import { useLookupData } from '../../hooks/useZohoData';

interface AddRecordFormProps {
  tableConfig: TableConfig;
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  initialValues?: Record<string, any>;
  readOnlyFields?: string[];
}

const AddRecordForm: React.FC<AddRecordFormProps> = ({
  tableConfig,
  onSubmit,
  onCancel,
  loading = false,
  initialValues = {},
  readOnlyFields = [],
}) => {
  const validationSchema = validationSchemas[tableConfig.name.toLowerCase() as keyof typeof validationSchemas];
  const lookupData = useLookupData(tableConfig.tableName);
  
  const formik = useFormik({
    initialValues: {
      ...tableConfig.fields.reduce((acc: Record<string, any>, field: FieldConfig) => {
        // Set default value for active fields to true
        if (field.key === 'active') {
          acc[field.key] = true;
        } else if (field.key === 'employee_id' && tableConfig.tableName === 'employee_commissions_DC') {
          // Auto-generate employee ID (simple increment from current max)
          acc[field.key] = Math.floor(Math.random() * 1000) + 100; // Random ID between 100-1099
        } else {
          acc[field.key] = '';
        }
        return acc;
      }, {} as Record<string, any>),
      ...initialValues // Override with provided initial values
    },
    validationSchema,
    onSubmit: async (values: any) => {
      try {
        await onSubmit(values);
        formik.resetForm();
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    },
  });

  const getFieldOptions = useCallback((field: FieldConfig) => {
    if (field.lookupTable) {
      switch (field.lookupTable) {
        case 'insurance_companies_DC':
          const companyOptions = lookupData.companies?.map((company: any) => ({
            value: String(company[field.lookupValueField || 'id']),
            label: company[field.lookupDisplayField || 'company']
          })) || [];
          return companyOptions;
        case 'payment_modalities':
          // Reduced debug logging to prevent excessive re-renders
          if (!sessionStorage.getItem('addform-payment-methods')) {
            console.log('PAYMENT METHOD DEBUG (payment_modalities):');
            console.log('PaymentMethods count: ' + (lookupData.paymentMethods?.length || 0));
            
            if (lookupData.paymentMethods?.length > 0) {
              const first = lookupData.paymentMethods[0];
              console.log('First method ID: ' + first?.id);
              console.log('First method name: ' + first?.payment_method);
              console.log('First method keys: ' + Object.keys(first || {}).join(', '));
            }
            sessionStorage.setItem('addform-payment-methods', 'true');
          }
          
          const paymentOptions = lookupData.paymentMethods?.map((method: any) => {
            const option = {
              value: String(method[field.lookupValueField || 'id']),
              label: method[field.lookupDisplayField || 'payment_method']
            };
            return option;
          }) || [];
          
          console.log('Payment options count: ' + paymentOptions.length);
          if (paymentOptions.length > 0) {
            console.log('First option value: ' + paymentOptions[0]?.value);
            console.log('First option label: ' + paymentOptions[0]?.label);
          }
          return paymentOptions;
        default:
          return [];
      }
    }
    return field.options?.map(opt => ({ value: String(opt.value), label: opt.label })) || [];
  }, [lookupData.companies, lookupData.paymentMethods]);

  const renderField = (field: FieldConfig) => {
    const { key, label, type, required, options } = field;
    const value = formik.values[key];
    const error = formik.touched[key] && formik.errors[key];
    const isReadOnly = readOnlyFields.includes(key);
    
    const commonProps = {
      id: key,
      name: key,
      value: value || '',
      onChange: isReadOnly ? undefined : formik.handleChange,
      onBlur: formik.handleBlur,
      required,
      disabled: isReadOnly,
    };

    switch (type) {
      case 'email':
        return (
          <Input
            {...commonProps}
            type="email"
            label={label}
            error={error as string}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        );
        
      case 'tel':
        return (
          <Input
            {...commonProps}
            type="tel"
            label={label}
            error={error as string}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        );
        
      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            label={label}
            error={error as string}
            placeholder={`Enter ${label.toLowerCase()}`}
            min="0"
            step="any"
          />
        );
        
      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            label={label}
            error={error as string}
          />
        );
        
      case 'select':
        const selectOptions = getFieldOptions(field);
        // Reduced debug logging to prevent excessive re-renders
        if (!sessionStorage.getItem('addform-select-' + key)) {
          console.log('SELECT DEBUG for ' + key + ':');
          console.log('Options count: ' + selectOptions.length);
          console.log('Field type: ' + (field.lookupTable || 'static'));
          if (selectOptions.length > 0) {
            console.log('First option: ' + selectOptions[0]?.value + ' = ' + selectOptions[0]?.label);
          }
          sessionStorage.setItem('addform-select-' + key, 'true');
        }
        
        return (
          <Select
            id={key}
            name={key}
            value={value || ''}
            onChange={(value) => formik.setFieldValue(key, value)}
            onBlur={() => formik.handleBlur({ target: { name: key } })}
            required={required}
            disabled={isReadOnly}
            label={label}
            error={error as string}
            options={selectOptions}
            placeholder={`Select ${label.toLowerCase()}`}
          />
        );
        
      case 'toggle':
        return (
          <Toggle
            id={key}
            name={key}
            checked={value || false}
            onChange={(checked) => formik.setFieldValue(key, checked)}
            onBlur={() => formik.handleBlur({ target: { name: key } })}
            label={label}
            error={error as string}
          />
        );
        
      default:
        return (
          <Input
            {...commonProps}
            type="text"
            label={label}
            error={error as string}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tableConfig.fields.map((field: FieldConfig) => (
          <div key={field.key} className={field.type === 'date' ? 'md:col-span-2' : ''}>
            {renderField(field)}
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
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
          variant="primary"
          loading={loading}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Record
        </Button>
      </div>
    </form>
  );
};

export default AddRecordForm;
