# Zoho Analytics Management Interface

A modern React-based internal web application for managing Zoho Analytics tables with a sophisticated Dark Accent Modern design.

## 🚀 Features

### Core Functionality
- **CRUD Operations**: Create, Read, Update, Delete records for all tables
- **Real-time Search & Filtering**: Advanced search with multiple filter options
- **Pagination**: Efficient data loading with configurable page sizes
- **Export Capabilities**: CSV and Excel export functionality
- **Bulk Operations**: Multi-select and bulk actions
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### Zoho Analytics Integration
- **Real Table Structure**: Based on actual Zoho Analytics tables from your data
- **Lookup Relationships**: Dynamic dropdowns populated from related tables
- **Data Validation**: Comprehensive client-side validation with Yup schemas
- **Mock Data Mode**: Development-friendly with realistic sample data
- **API Ready**: Easy transition to live Zoho Analytics API

### Tables Available
1. **Company Upcharge Fees** (`company_upcharge_fees_DC`)
   - Company selection from insurance companies lookup
   - Payment method selection from payment modalities lookup
   - Currency fields for fees with proper formatting
   - Percentage fields for multipliers
   - Date range management with effective dates

2. **Employee Commissions** (`employee_commissions_DC`)
   - Employee management with commission percentages
   - Optional company and payment method associations
   - Global and specific commission rules

3. **Monthly Interchange Income** (`monthly_interchange_income_DC`)
   - Interchange revenue tracking by company
   - Transaction period management
   - Rate and amount calculations

4. **Monthly Interest Revenue** (`monthly_interest_revenue_DC`)
   - Interest income tracking by company
   - Account balance management
   - Interest rate calculations

5. **Referral Partners** (`referral_partners_DC`)
   - Partner relationship management
   - Commission percentage tracking
   - Contact information management

### Lookup Tables
- **Insurance Companies** (`insurance_companies_DC`): 30+ insurance companies
- **Payment Modalities** (`payment_modalities`): 9 payment methods including ACH, Virtual Card, Instant Deposit, etc.

## 🛠 Technical Stack

- **React 18+** with functional components and hooks
- **TypeScript** for type safety
- **Tailwind CSS** for styling (Dark Accent Modern theme)
- **Lucide React** for icons
- **Axios** for API calls
- **TanStack Query v5** for data management and caching
- **Formik** for form management
- **Yup** for validation schemas

## 🎨 Design System

### Dark Accent Modern Theme
- **Primary Colors**: Slate-800, Slate-700 for dark elements
- **Background**: Slate-50 for light backgrounds
- **Interactive Elements**: Enhanced padding and larger touch targets
- **Typography**: Bold hierarchy with enhanced visual weight
- **Borders**: Prominent borders with rounded corners (rounded-xl, rounded-2xl)
- **Form Fields**: Large inputs with enhanced focus states
- **Table Cells**: Generous padding (px-8 py-6) for better readability

### Component Features
- **Gradient Headers**: Dark slate gradients in modals
- **Status Badges**: Color-coded status indicators
- **Hover Effects**: Smooth transitions and interactive feedback
- **Loading States**: Skeleton screens and loading indicators
- **Error Handling**: User-friendly error messages and validation

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/           # Layout components (Header, Sidebar, Layout)
│   ├── ui/              # Reusable UI components (Button, Input, Modal, etc.)
│   ├── forms/           # Form components (AddRecordForm, EditRecordForm)
│   └── tables/          # Table components (DataTable, TableActions)
├── services/
│   ├── zohoApi.ts       # Zoho Analytics API integration
│   ├── mockData.ts      # Mock data for development
│   └── apiTypes.ts      # TypeScript interfaces
├── hooks/
│   ├── useZohoData.ts   # React Query hooks for data fetching
│   └── useZohoMutations.ts # React Query hooks for mutations
├── config/
│   └── tableConfigs.ts  # Table configurations and validation schemas
├── pages/
│   └── TableView.tsx    # Main table view component
└── App.tsx              # Root application component
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd zoho-analytics-manager

# Install dependencies
npm install

# Start development server
npm start
```

The application will be available at `http://localhost:3000`

### Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Zoho Analytics API Configuration
REACT_APP_ZOHO_API_BASE=https://analyticsapi.zoho.com/api/v1
REACT_APP_ZOHO_API_TOKEN=your_api_token_here
REACT_APP_WORKSPACE_ID=your_workspace_id_here

# Development Options
REACT_APP_ENABLE_MOCK_DATA=true  # Set to false for live API
```

## 🔧 Configuration

### Table Configuration
Each table is configured in `src/config/tableConfigs.ts` with:

- **Field Definitions**: Type, validation, lookup relationships
- **Display Columns**: Which columns to show in the table
- **Validation Schemas**: Yup validation rules
- **Formatters**: Custom formatting for currency, dates, percentages

### Lookup Tables
Lookup relationships are automatically handled:

1. **Company Selection**: Dropdowns populated from `insurance_companies_DC`
2. **Payment Methods**: Dropdowns populated from `payment_modalities`
3. **Display Names**: Shows company names instead of IDs
4. **Data Integrity**: Maintains proper foreign key relationships

### Field Types Supported
- **Text**: Standard text input
- **Email**: Email validation
- **Number**: Numeric input with min/max validation
- **Currency**: Money formatting with decimal precision
- **Percentage**: Percentage formatting (0-100% or 0-1)
- **Date**: Date picker with validation
- **Select**: Dropdown with options or lookup data
- **Toggle**: Boolean switch for active/inactive status

## 🔌 API Integration

### Current State: Mock Data
The application currently runs with realistic mock data based on your CSV files:
- All CRUD operations work with mock data
- Lookup relationships are functional
- Export functionality is simulated
- Perfect for development and testing

### Transition to Live API
To connect to live Zoho Analytics:

1. **Update Environment Variables**:
   ```env
   REACT_APP_ENABLE_MOCK_DATA=false
   REACT_APP_ZOHO_API_TOKEN=your_actual_token
   REACT_APP_WORKSPACE_ID=your_actual_workspace_id
   ```

2. **API Endpoints**: The `zohoApi.ts` service is ready for:
   - Table data CRUD operations
   - Lookup table fetching
   - Search and filtering
   - Export functionality

3. **Authentication**: JWT token management is implemented
4. **Error Handling**: Comprehensive error handling for API failures

## 📊 Data Tables

### Company Upcharge Fees
Manages fee structures for different companies and payment methods:
- Base fee upcharges
- Multiplier percentages
- Maximum fee caps
- Effective date ranges

### Employee Commissions
Tracks commission structures for employees:
- Global commission rules
- Company-specific commissions
- Payment method-specific commissions
- Commission percentages and amounts

### Monthly Interchange Income
Records interchange revenue by company:
- Interchange amounts and rates
- Transaction periods and counts
- Invoice tracking
- Revenue attribution

### Monthly Interest Revenue
Manages interest income tracking:
- Interest amounts and rates
- Account balances
- Interest periods
- Bank account management

### Referral Partners
Tracks partner relationships:
- Partner information
- Commission structures
- Contact details
- Partnership status

## 🎯 Usage Examples

### Adding a Company Upcharge Fee
1. Navigate to "Company Upcharge Fees" table
2. Click "Add New" button
3. Select company from dropdown (populated from insurance companies)
4. Select payment method from dropdown (populated from payment modalities)
5. Enter base fee, multiplier, and max fee
6. Set effective dates
7. Toggle active status
8. Save record

### Searching and Filtering
- Use the search bar for text-based searches across all fields
- Sort by any column by clicking column headers
- Filter by status using the filter dropdown
- Paginate through large datasets

### Exporting Data
- Click "Export" button in header
- Data is exported in CSV format
- Includes all visible columns
- Respects current search/filter state

## 🔒 Security Features

- **Input Validation**: Client-side validation with Yup schemas
- **Type Safety**: Full TypeScript coverage
- **Error Boundaries**: Graceful error handling
- **Secure Storage**: Environment variable management
- **API Security**: Token-based authentication ready

## 🚀 Performance Optimizations

- **React Query**: Intelligent caching and background updates
- **Virtualization**: Efficient rendering of large datasets
- **Debounced Search**: Optimized search performance
- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo for expensive components

## 🧪 Testing

The application includes comprehensive testing setup:
- Unit tests for components
- Integration tests for API calls
- Mock data for development
- Error scenario testing

## 📈 Future Enhancements

- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: Charts and dashboards
- **Bulk Import**: CSV/Excel import functionality
- **Audit Trail**: Change tracking and history
- **User Management**: Role-based access control
- **Mobile App**: React Native companion app

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the code comments
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ for efficient Zoho Analytics management**
