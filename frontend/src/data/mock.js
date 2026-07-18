export const clients = [
  { id: 1, name: 'ABC Infrastructure', company: 'ABC Infra Ltd', projects: 2, contact: 'abc@example.com', status: 'Active' },
  { id: 2, name: 'Vision Interiors', company: 'Vision Group', projects: 1, contact: 'contact@vision.com', status: 'Active' },
  { id: 3, name: 'Elite Developers', company: 'Elite Dev', projects: 1, contact: 'hello@elite.com', status: 'Inactive' },
];

export const projects = [
  { id: 1, name: 'Metro Road Development', client: 'ABC Infrastructure', budget: 50000000, received: 38000000, expenses: 25800000, progress: 82, status: 'Active', startDate: '2023-01-15', expectedCompletion: '2024-12-31' },
  { id: 2, name: 'Corporate Office Interior', client: 'Vision Interiors', budget: 15000000, received: 8000000, expenses: 4900000, progress: 55, status: 'Active', startDate: '2023-06-01', expectedCompletion: '2023-11-30' },
  { id: 3, name: 'Shopping Mall Renovation', client: 'Elite Developers', budget: 25000000, received: 15000000, expenses: 14000000, progress: 40, status: 'Active', startDate: '2023-08-10', expectedCompletion: '2024-05-15' },
  { id: 4, name: 'Hospital Construction', client: 'ABC Infrastructure', budget: 120000000, received: 40000000, expenses: 38000000, progress: 30, status: 'Active', startDate: '2023-09-01', expectedCompletion: '2025-12-31' },
];

export const transactions = [
  { id: 1, date: '2023-10-01', project: 'Metro Road Development', type: 'Income', party: 'ABC Infrastructure', category: 'Advance', amount: 10000000, status: 'Completed', paymentMethod: 'Net Banking', narration: 'Initial mobilization advance' },
  { id: 2, date: '2023-10-05', project: 'Metro Road Development', type: 'Expense', party: 'Rahul Sharma', category: 'Labour', amount: 80000, status: 'Completed', paymentMethod: 'Cash', narration: 'Weekly wages for site A' },
  { id: 3, date: '2023-10-08', project: 'Corporate Office Interior', type: 'Expense', party: 'ABC Cement', category: 'Material', amount: 220000, status: 'Completed', paymentMethod: 'Net Banking', narration: '500 bags of Portland Cement' },
  { id: 4, date: '2023-10-12', project: 'Shopping Mall Renovation', type: 'Income', party: 'Elite Developers', category: 'Second Installment', amount: 15000000, status: 'Completed', paymentMethod: 'Net Banking', narration: 'Payment against RA Bill 1' },
  { id: 5, date: '2023-10-15', project: 'Hospital Construction', type: 'Expense', party: 'JCB Services', category: 'Machinery', amount: 110000, status: 'Completed', paymentMethod: 'UPI', narration: 'Excavator rental for 5 days' },
  { id: 6, date: '2023-10-30', project: 'Metro Road Development', type: 'Expense', party: 'ABC Cement', category: 'Material', amount: 350000, status: 'Pending', paymentMethod: 'Net Banking', narration: 'TMT Steel bars procurement' },
];

export const initialCategories = [
  { id: 1, name: 'Advance', type: 'Income' },
  { id: 2, name: 'First Installment', type: 'Income' },
  { id: 3, name: 'Second Installment', type: 'Income' },
  { id: 4, name: 'Final Payment', type: 'Income' },
  { id: 5, name: 'Material', type: 'Expense' },
  { id: 6, name: 'Labour', type: 'Expense' },
  { id: 7, name: 'Machinery', type: 'Expense' },
  { id: 8, name: 'Transport', type: 'Expense' },
  { id: 9, name: 'Miscellaneous', type: 'Expense' }
];

export const people = [
  { id: 1, name: 'Rahul Sharma', role: 'Site Supervisor', totalPaid: 280000, workAssigned: 'Foundation' },
  { id: 2, name: 'Amit Patel', role: 'Contractor', totalPaid: 450000, workAssigned: 'Civil Work' },
  { id: 3, name: 'ABC Cement', role: 'Supplier', totalPaid: 1200000, workAssigned: 'Material Supply' },
  { id: 4, name: 'JCB Services', role: 'Machinery', totalPaid: 850000, workAssigned: 'Excavation' },
];

export const formatCurrency = (value) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  } else {
    return `₹${value.toLocaleString('en-IN')}`;
  }
};

export const formatFullCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
};
