# Grouped Employee Commissions View

## Overview

The Employee Commissions table now includes a new **Grouped View** that organizes commission records by employee, making it easier to analyze commission data across different companies and payment methods.

## Features

### Grouped Display
- **Employee Groups**: All commission records for each employee are grouped together
- **Summary Statistics**: Each group shows:
  - Total commission amount
  - Average commission percentage
  - Associated companies (with badges)
  - Payment methods (with badges)
  - Number of records

### Expandable Details
- **Collapsible Groups**: Click the chevron icon to expand/collapse individual employee groups
- **Detailed Records**: When expanded, shows all commission records for that employee with:
  - Payment method
  - Company
  - Commission percentage
  - Commission amount
  - Effective start date
  - Status (Active/Inactive)
  - Action buttons (Edit/Delete)

### Advanced Filtering
- **Employee Name**: Filter by employee name
- **Company**: Filter by company name
- **Payment Method**: Filter by payment method
- **Commission Range**: Filter by minimum and maximum commission amounts
- **Clear Filters**: One-click filter reset

### Bulk Actions
- **Expand All/Collapse All**: Toggle all groups at once
- **Select All**: Select all records across all groups
- **Individual Selection**: Select specific records within groups

### Summary Dashboard
The grouped view includes a summary section showing:
- Total number of employees
- Total number of records
- Total commission amount across all employees
- Average commission percentage across all employees

## How to Use

1. **Navigate** to the Employee Commissions table
2. **Click** the "Grouped View" button in the header
3. **Use filters** to narrow down the data as needed
4. **Expand groups** to see detailed commission records
5. **Use bulk actions** to manage multiple records efficiently

## Switching Views

- **Grouped View**: Click "Grouped View" button (shows as "Regular View" when active)
- **Regular View**: Click "Regular View" button to return to the standard table view

## Benefits

- **Better Organization**: Related commission records are grouped logically
- **Quick Analysis**: Summary statistics provide immediate insights
- **Efficient Filtering**: Advanced filters help find specific data quickly
- **Improved UX**: Expandable groups reduce visual clutter while maintaining access to details
- **Bulk Operations**: Easier to manage multiple records for the same employee

## Technical Details

- Built with React and TypeScript
- Uses existing data structures and APIs
- Maintains all existing functionality (edit, delete, pagination)
- Responsive design for mobile and desktop
- Real-time filtering and grouping
