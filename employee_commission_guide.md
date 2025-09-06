# Employee Commission System - Complete Guide
## Disbursecloud Revenue Analytics

---

## 🎯 **HOW EMPLOYEE COMMISSIONS WORK IN revenue_master_view**

### **Current Implementation - Multiple Employee Support**

With the recent updates, your `revenue_master_view` now supports **multiple employees per transaction** through a dynamic lookup system.

### **1. Commission Lookup Logic**

The SQL uses this join:
```sql
LEFT JOIN employee_commissions_DC ec ON (
    (ec.payment_method_id IS NULL OR dt.payment_method_id = ec.payment_method_id) AND
    (ec.company_id IS NULL OR d.company_id = ec.company_id) AND
    ec.active = 'Yes'
)
```

**This means:**
- **If multiple employees match the criteria** → Multiple rows will be created
- **Each row shows individual employee commission** for that specific employee
- **Revenue, vendor costs, etc. are the same** across all employee rows for the same transaction

### **2. Priority-Based Matching System**

The system finds employees using this priority:

| **Priority** | **Match Type** | **Example** | **When Used** |
|--------------|----------------|-------------|---------------|
| **1 (Highest)** | Exact Match | `payment_method_id = 3 AND company_id = 23` | Skip: Virtual Card for Company 23 |
| **2** | Payment Method | `payment_method_id = 3 AND company_id = NULL` | Skip: Virtual Card for ALL companies |
| **3** | Company Specific | `payment_method_id = NULL AND company_id = 23` | Skip: ALL payment methods for Company 23 |
| **4 (Lowest)** | Global | `payment_method_id = NULL AND company_id = NULL` | Skip: ALL methods, ALL companies |

### **3. Individual Commission Calculation Per Row**

Each row in `revenue_master_view` calculates:
```sql
Employee_Commission = (Revenue_After_Operational_Costs × commission_percentage) + commission_amount
```

**For each employee individually.**

---

## 📊 **CREATING EMPLOYEE EARNINGS REPORTS**

### **Report 1: Individual Employee Earnings Summary**

```sql
SELECT 
    ec.employee_name,
    COUNT(*) as Total_Transactions,
    SUM(Employee_Commission) as Total_Commission_Earned,
    AVG(Employee_Commission) as Average_Commission_Per_Transaction,
    MIN(Employee_Commission) as Lowest_Commission,
    MAX(Employee_Commission) as Highest_Commission,
    SUM(Revenue_After_Operational_Costs) as Total_Revenue_Base,
    AVG(applied_employee_commission_percentage) as Average_Commission_Rate,
    MIN(disbursement_updated_at) as First_Commission_Date,
    MAX(disbursement_updated_at) as Last_Commission_Date
FROM revenue_master_view
WHERE Is_Revenue_Transaction = 1 
  AND Employee_Commission > 0
GROUP BY ec.employee_name
ORDER BY Total_Commission_Earned DESC
```

**Expected Output:**
| Employee_Name | Total_Transactions | Total_Commission_Earned | Average_Commission_Per_Transaction | Average_Commission_Rate |
|---------------|-------------------|-------------------------|-----------------------------------|------------------------|
| Skip | 125 | $1,958.54 | $15.67 | 20.00% |
| John | 125 | $1,456.78 | $11.65 | 15.00% |

### **Report 2: Commission Breakdown by Payment Method**

```sql
SELECT 
    ec.employee_name,
    pt.description as Payment_Method,
    COUNT(*) as Transaction_Count,
    SUM(Employee_Commission) as Commission_Earned,
    AVG(Employee_Commission) as Avg_Commission_Per_Transaction,
    SUM(Revenue_After_Operational_Costs) as Revenue_Base,
    AVG(applied_employee_commission_percentage) as Commission_Rate_Applied
FROM revenue_master_view rmv
JOIN payment_type_DC pt ON rmv.payment_method_id = pt.id
WHERE Is_Revenue_Transaction = 1 
  AND Employee_Commission > 0
GROUP BY ec.employee_name, pt.description
ORDER BY ec.employee_name, Commission_Earned DESC
```

### **Report 3: Monthly Commission Statements**

```sql
SELECT 
    ec.employee_name,
    DATE_FORMAT(disbursement_updated_at, '%Y-%m') as Commission_Month,
    COUNT(*) as Monthly_Transactions,
    SUM(Employee_Commission) as Monthly_Commission_Total,
    AVG(Employee_Commission) as Avg_Commission_Per_Transaction,
    SUM(Revenue_After_Operational_Costs) as Monthly_Revenue_Base
FROM revenue_master_view
WHERE Is_Revenue_Transaction = 1 
  AND Employee_Commission > 0
GROUP BY ec.employee_name, DATE_FORMAT(disbursement_updated_at, '%Y-%m')
ORDER BY ec.employee_name, Commission_Month DESC
```

### **Report 4: Transaction-Level Commission Detail**

```sql
SELECT 
    disbursement_id,
    payment_method_description,
    company,
    amount as Transaction_Amount,
    ec.employee_name,
    Revenue_After_Operational_Costs,
    applied_employee_commission_percentage as Commission_Rate,
    applied_employee_commission_amount as Fixed_Amount,
    Employee_Commission as Commission_Earned,
    disbursement_updated_at as Transaction_Date
FROM revenue_master_view
WHERE Is_Revenue_Transaction = 1 
  AND Employee_Commission > 0
ORDER BY disbursement_updated_at DESC, disbursement_id, ec.employee_name
LIMIT 50
```

---

## 🔍 **UNDERSTANDING THE MULTIPLE EMPLOYEE EFFECT**

### **Example: Skip + John Both Work Virtual Card for Company 23**

**Transaction Details:**
- **Amount:** $1,000 Virtual Card for Company 23
- **Revenue After Operational Costs:** $950

**Commission Table Setup:**
```sql
Skip: payment_method_id=3, company_id=23, $5.00 + 20%
John: payment_method_id=3, company_id=23, $2.00 + 15%
```

**Result in revenue_master_view:**
```
Row 1: 
- employee_name: "Skip"
- Employee_Commission: $5.00 + ($950 × 20%) = $195.00
- Revenue_After_Operational_Costs: $950.00

Row 2:
- employee_name: "John" 
- Employee_Commission: $2.00 + ($950 × 15%) = $144.50
- Revenue_After_Operational_Costs: $950.00 (same as Skip's row)
```

**Total Commission for Transaction:** $195.00 + $144.50 = $339.50

---

## 📈 **DASHBOARD WIDGETS FOR EMPLOYEE PERFORMANCE**

### **KPI Widget 1: Total Employee Commission**
```sql
SELECT SUM(Employee_Commission) as Total_Employee_Commission
FROM revenue_master_view
WHERE Is_Revenue_Transaction = 1
```

### **KPI Widget 2: Commission by Employee**
```sql
SELECT 
    ec.employee_name,
    SUM(Employee_Commission) as Total_Commission
FROM revenue_master_view
WHERE Is_Revenue_Transaction = 1
GROUP BY ec.employee_name
ORDER BY Total_Commission DESC
```

### **KPI Widget 3: Average Commission Rate**
```sql
SELECT 
    ec.employee_name,
    AVG(applied_employee_commission_percentage) as Avg_Commission_Rate
FROM revenue_master_view
WHERE Employee_Commission > 0
GROUP BY ec.employee_name
```

---

## ⚠️ **IMPORTANT CONSIDERATIONS**

### **1. Revenue Duplication Effect**
With multiple employees, revenue metrics will be **duplicated** across employee rows:
- **Gross_Revenue:** Shows same amount for each employee row
- **Final_Net_Profit:** Shows profit after ONLY that employee's commission (not total)

### **2. Corrected KPI Calculations**

**WRONG (Double Counts Revenue):**
```sql
SELECT SUM(Gross_Revenue) FROM revenue_master_view  -- Counts revenue multiple times
```

**CORRECT (Unique Revenue):**
```sql
SELECT SUM(Gross_Revenue) 
FROM (
    SELECT DISTINCT disbursement_id, Gross_Revenue 
    FROM revenue_master_view 
    WHERE Is_Revenue_Transaction = 1
) unique_transactions
```

### **3. Total Commission per Transaction**
```sql
-- Total commission cost per transaction
SELECT 
    disbursement_id,
    COUNT(DISTINCT ec.employee_name) as Employee_Count,
    SUM(Employee_Commission) as Total_Employee_Commission,
    MAX(Gross_Revenue) as Transaction_Revenue,  -- Use MAX to avoid duplication
    STRING_AGG(ec.employee_name, ', ') as Employees_Involved
FROM revenue_master_view
WHERE Employee_Commission > 0
GROUP BY disbursement_id
ORDER BY Total_Employee_Commission DESC
```

---

## 🧪 **VALIDATION QUERIES**

### **Test 1: Check Multiple Employees Working**
```sql
SELECT 
    'Multiple Employees Per Transaction' as Test_Name,
    COUNT(*) as Transactions_With_Multiple_Employees
FROM (
    SELECT disbursement_id
    FROM revenue_master_view
    WHERE Employee_Commission > 0
    GROUP BY disbursement_id
    HAVING COUNT(DISTINCT ec.employee_name) > 1
) multi_employee_transactions
```

### **Test 2: Commission Total Verification**
```sql
SELECT 
    'Commission Verification' as Test_Name,
    SUM(Employee_Commission) as Total_Commission_Paid,
    COUNT(DISTINCT ec.employee_name) as Active_Employees,
    COUNT(*) as Commission_Rows
FROM revenue_master_view
WHERE Employee_Commission > 0
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Add Second Employee for Testing**
```sql
INSERT INTO employee_commissions_DC (
    employee_name, 
    payment_method_id, 
    company_id,
    commission_amount, 
    commission_percentage,
    effective_start_date, 
    active
) VALUES (
    'John',           -- Employee name
    3,               -- Virtual Card (same as Skip)
    23,              -- Company 23 (same as Skip) 
    '$2.00',         -- Different fixed amount
    15.00,           -- Different percentage
    '2024-12-01',    -- Effective date
    'Yes'            -- Active
);
```

### **Step 2: Verify Multiple Employee Setup**
```sql
-- Check current employee commission setup
SELECT 
    employee_name,
    payment_method_id,
    company_id,
    commission_amount,
    commission_percentage,
    active
FROM employee_commissions_DC
WHERE active = 'Yes'
ORDER BY employee_name, payment_method_id, company_id
```

### **Step 3: Test Multiple Rows Creation**
```sql
-- Check if transactions now show multiple employees
SELECT 
    disbursement_id,
    COUNT(DISTINCT ec.employee_name) as Employee_Count,
    STRING_AGG(DISTINCT ec.employee_name, ', ') as Employees,
    SUM(Employee_Commission) as Total_Transaction_Commission
FROM revenue_master_view
WHERE Employee_Commission > 0
GROUP BY disbursement_id
HAVING COUNT(DISTINCT ec.employee_name) > 1  -- Only transactions with multiple employees
ORDER BY Employee_Count DESC, Total_Transaction_Commission DESC
LIMIT 10
```

### **Step 4: Run Employee Summary Report**
Use **Report 1** above to see individual employee earnings summary.

---

## 📋 **COMMISSION STRUCTURE EXAMPLES**

### **Example 1: Global Employee (All Methods, All Companies)**
```sql
INSERT INTO employee_commissions_DC (
    employee_name, payment_method_id, company_id,
    commission_amount, commission_percentage,
    effective_start_date, active
) VALUES (
    'Sarah',    -- Global employee
    NULL,       -- ALL payment methods
    NULL,       -- ALL companies
    '$1.00',    -- Base amount
    10.00,      -- 10% commission
    '2024-12-01', 'Yes'
);
```

### **Example 2: Payment Method Specialist**
```sql
INSERT INTO employee_commissions_DC (
    employee_name, payment_method_id, company_id,
    commission_amount, commission_percentage,
    effective_start_date, active
) VALUES (
    'Mike',     -- ACH specialist
    1,          -- ACH only
    NULL,       -- ALL companies
    '$3.00',    -- Higher base for specialty
    25.00,      -- Higher rate for expertise
    '2024-12-01', 'Yes'
);
```

### **Example 3: Company Account Manager**
```sql
INSERT INTO employee_commissions_DC (
    employee_name, payment_method_id, company_id,
    commission_amount, commission_percentage,
    effective_start_date, active
) VALUES (
    'Lisa',     -- Account manager
    NULL,       -- ALL payment methods
    23,         -- Company 23 only
    '$5.00',    -- High base for key account
    30.00,      -- Premium rate for account management
    '2024-12-01', 'Yes'
);
```

---

## 💡 **KEY BENEFITS OF THIS SYSTEM**

### **✅ Individual Performance Tracking**
- **Separate commission calculations** for each employee
- **Individual performance metrics** and rankings
- **Custom commission structures** per employee role

### **✅ Flexible Commission Structures**
- **Global rates** for all transactions
- **Payment method specialization** rates
- **Company-specific** account management rates
- **Exact match** for unique arrangements

### **✅ Scalable Team Management**
- **Easy addition** of new employees
- **Role-based commission** structures
- **Historical tracking** of commission changes
- **Audit trail** for all commission calculations

### **✅ Accurate Financial Reporting**
- **True commission costs** per transaction
- **Individual employee** earnings statements
- **Department-level** commission analysis
- **Profit impact** of commission structure changes

---

## 🎯 **NEXT STEPS**

1. **Add additional employees** using the examples above
2. **Run the employee summary reports** to see individual earnings
3. **Create dashboard widgets** for employee performance tracking
4. **Set up automated monthly** commission statements
5. **Monitor commission costs** vs. revenue generation

**The system now provides complete individual employee commission tracking with unlimited flexibility for different commission structures! 🚀**