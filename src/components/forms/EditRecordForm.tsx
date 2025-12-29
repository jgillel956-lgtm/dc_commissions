import React, { useEffect } from 'react';
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
          try {
            let parsedDate;
            
            // Handle different date formats
            if (value.includes('-') && value.split('-').length === 3) {
              // Handle "01-01-2025" or "2025-01-01" format
              const parts = value.split('-');
              if (parts[0].length === 4) {
                // Already in yyyy-MM-dd format
                parsedDate = new Date(value + 'T00:00:00');
              } else {
                // Convert MM-dd-yyyy to yyyy-MM-dd
                parsedDate = new Date(`${parts[2]}-${parts[0]}-${parts[1]}T00:00:00`);
              }
            } else if (value.includes('Aug') || value.includes('Jan') || value.includes('Feb') || 
                       value.includes('Mar') || value.includes('Apr') || value.includes('May') || 
                       value.includes('Jun') || value.includes('Jul') || value.includes('Sep') || 
                       value.includes('Oct') || value.includes('Nov') || value.includes('Dec')) {
              // Handle "26 Aug 2025 00:00:00" format
              parsedDate = new Date(value);
            } else {
              // Try parsing as-is
              parsedDate = new Date(value);
            }
            
            if (!isNaN(parsedDate.getTime())) {
              value = parsedDate.toISOString().split('T')[0]; // yyyy-MM-dd format
            } else {
              console.warn('Failed to parse date:', value);
              value = '';
            }
          } catch (e) {
            console.warn('Failed to parse date:', value, e);
            value = '';
          }
        }
      }
      
      acc[field.key] = value;
      return acc;
    }, {} as Record<string, any>),
    validationSchema,
    onSubmit: async (values: any) => {
      console.log('📝 EditRecordForm onSubmit called with values:', values);
      console.log('🔄 Original record:', record);
      try {
        console.log('🚀 Calling parent onSubmit...');
        await onSubmit(values);
        console.log('✅ Parent onSubmit completed successfully');
      } catch (error) {
        console.error('❌ Error in EditRecordForm onSubmit:', error);
      }
    },
  });

  // Auto-fill Interest Period End for Monthly Interest Revenue (same as AddRecordForm)
  useEffect(() => {
    if (tableConfig.tableName === 'monthly_interest_revenue_DC' && formik.values.interest_period_start) {
      const startDateValue = formik.values.interest_period_start;
      
      // Handle different date formats more reliably
      let startDate;
      if (typeof startDateValue === 'string') {
        // If it's in YYYY-MM-DD format, parse it directly
        if (startDateValue.includes('-')) {
          startDate = new Date(startDateValue + 'T00:00:00');
        } else {
          // Handle MM/DD/YYYY format
          startDate = new Date(startDateValue);
        }
      } else {
        startDate = new Date(startDateValue);
      }
      
      if (!isNaN(startDate.getTime())) {
        console.log('Edit form - Start date parsed:', startDate.toISOString(), 'Month:', startDate.getMonth(), 'Year:', startDate.getFullYear());
        
        // Get the last day of the same month as the start date
        const year = startDate.getFullYear();
        const month = startDate.getMonth(); // 0-based (0 = January, 10 = November)
        const endDate = new Date(year, month + 1, 0); // Last day of the current month
        
        console.log('Edit form - End date calculated:', endDate.toISOString(), 'Month:', endDate.getMonth());
        
        const formattedEndDate = endDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Only update if the end date is different to avoid infinite loops
        if (formik.values.interest_period_end !== formattedEndDate) {
          console.log('Edit form - Setting end date to:', formattedEndDate);
          formik.setFieldValue('interest_period_end', formattedEndDate);
        }
      }
    }
  }, [formik.values.interest_period_start, tableConfig.tableName, formik]);

  const getFieldOptions = (field: FieldConfig) => {
    if (field.lookupTable) {
      switch (field.lookupTable) {
        case 'insurance_companies_DC':
          return lookupData.companies?.map((company: any) => ({
            value: String(company[field.lookupValueField || 'id']),
            label: company[field.lookupDisplayField || 'company']
          })) || [];
        case 'payment_modalities':
          const paymentOptions = lookupData.paymentMethods?.map((method: any) => ({
            value: String(method[field.lookupValueField || 'id']),
            label: method[field.lookupDisplayField || 'payment_method']
          })) || [];
          console.log('💳 Edit form payment options:', paymentOptions.length);
          return paymentOptions;
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
            id={key}
            name={key}
            value={value || ''}
            onChange={(selectedValue) => formik.setFieldValue(key, selectedValue)}
            onBlur={() => formik.handleBlur({ target: { name: key } })}
            label={label}
            error={error as string}
            options={getFieldOptions(field)}
            placeholder={`Select ${label.toLowerCase()}`}
            required={required}
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
