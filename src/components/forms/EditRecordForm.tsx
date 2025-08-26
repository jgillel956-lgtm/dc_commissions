import React from 'react';
import { useFormik } from 'formik';
import { Save, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';
import { TableConfig, FieldConfig } from '../../config/tableConfigs';
import { validationSchemas } from '../../config/tableConfigs';
import { useLookupData } from '../../hooks/useZohoData';

interface EditRecordFormProps {
  tableConfig: TableConfig;
  record: any;
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const EditRecordForm: React.FC<EditRecordFormProps> = ({
  tableConfig,
  record,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const validationSchema = validationSchemas[tableConfig.name.toLowerCase() as keyof typeof validationSchemas];
  const lookupData = useLookupData(tableConfig.tableName);
  
  const formik = useFormik({
    initialValues: tableConfig.fields.reduce((acc: Record<string, any>, field: FieldConfig) => {
      let value = record[field.key] || '';
      
      // Handle date formatting for date fields
      if (field.type === 'date' && value) {
        // Convert various date formats to yyyy-MM-dd
        if (typeof value === 'string') {
          // Handle "26 Aug 2025 00:00:00" format
          if (value.includes('Aug') || value.includes('Jan') || value.includes('Feb') || 
              value.includes('Mar') || value.includes('Apr') || value.includes('May') || 
              value.includes('Jun') || value.includes('Jul') || value.includes('Sep') || 
              value.includes('Oct') || value.includes('Nov') || value.includes('Dec')) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                value = date.toISOString().split('T')[0]; // yyyy-MM-dd format
              }
            } catch (e) {
              console.warn('Failed to parse date:', value);
              value = '';
            }
          }
        }
      }
      
      acc[field.key] = value;
      return acc;
    }, {} as Record<string, any>),
    validationSchema,
    onSubmit: async (values: any) => {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Error updating record:', error);
      }
    },
  });

  const getFieldOptions = (field: FieldConfig) => {
    if (field.lookupTable) {
      switch (field.lookupTable) {
        case 'insurance_companies_DC':
          return lookupData.companies?.map((company: any) => ({
            value: company[field.lookupValueField || 'id'],
            label: company[field.lookupDisplayField || 'company']
          })) || [];
        case 'payment_modalities':
          return lookupData.paymentMethods?.map((method: any) => ({
            value: method[field.lookupValueField || 'id'],
            label: method[field.lookupDisplayField || 'payment_method']
          })) || [];
        default:
          return [];
      }
    }
    return field.options?.map(opt => ({ value: String(opt.value), label: opt.label })) || [];
  };

  const renderField = (field: FieldConfig) => {
    const { key, label, type, required, options } = field;
    const value = formik.values[key];
    const error = formik.touched[key] && formik.errors[key];
    
    const commonProps = {
      id: key,
      name: key,
      value: value || '',
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      required,
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
        return (
          <Select
            {...commonProps}
            label={label}
            error={error as string}
            options={getFieldOptions(field)}
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
          icon={<Save className="w-4 h-4" />}
        >
          Update Record
        </Button>
      </div>
    </form>
  );
};

export default EditRecordForm;
