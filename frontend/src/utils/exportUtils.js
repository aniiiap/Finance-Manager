import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const loadImage = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Export data to an Excel (.xlsx) file
 * @param {Array<Object>} data - Array of objects representing the rows
 * @param {string} filename - Name of the output file (without extension)
 */
export const exportToExcel = (data, filename, companyName = '') => {
  if (!data || data.length === 0) return;
  
  const worksheet = XLSX.utils.json_to_sheet([]);
  
  if (companyName) {
    XLSX.utils.sheet_add_aoa(worksheet, [[companyName]], { origin: "A1" });
    XLSX.utils.sheet_add_json(worksheet, data, { origin: "A3", skipHeader: false });
  } else {
    XLSX.utils.sheet_add_json(worksheet, data, { origin: "A1", skipHeader: false });
  }
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export data to a PDF file using autoTable
 * @param {Array<Object>} data - Array of objects representing the rows
 * @param {Array<string>} columns - Array of string keys for the table headers
 * @param {string} filename - Name of the output file (without extension)
 * @param {string} title - Optional title to print at the top of the PDF
 */
export const exportToPdf = async (data, columns, filename, title = '', companyName = '', companyLogo = '') => {
  if (!data || data.length === 0) return;
  
  const doc = new jsPDF();
  
  let startY = 14;
  let textStartX = 14;

  if (companyLogo) {
    const img = await loadImage(companyLogo);
    if (img) {
       doc.addImage(img, 14, 8, 12, 12);
       textStartX = 30;
       startY = 14; 
    }
  }
  
  if (companyName) {
    doc.setFontSize(16);
    doc.text(companyName, textStartX, startY);
    startY += 8;
  }
  
  if (title) {
    doc.setFontSize(12);
    doc.text(title, textStartX, startY);
    startY += 8;
  }
  
  if (companyLogo && startY < 24) {
    startY = 24;
  }

  // Format data for autotable
  const head = [columns];
  const body = data.map(row => columns.map(col => {
    const val = row[col];
    return val !== null && val !== undefined ? String(val) : '';
  }));

  autoTable(doc, {
    head: head,
    body: body,
    startY: startY + 2,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 },
    didParseCell: function(cellData) {
      if (cellData.section === 'body') {
        const colName = columns[cellData.column.index];
        if (['Amount', 'Profit', 'Income', 'Expense', 'Credit', 'Debit', 'Total Amount'].includes(colName)) {
          const valStr = String(cellData.cell.raw).replace(/[₹$,]/g, '').trim();
          const val = parseFloat(valStr);
          if (!isNaN(val)) {
             const rowRaw = cellData.row.raw || [];
             const isTotalExpense = rowRaw.includes('TOTAL EXPENSE');
             const isTotalIncome = rowRaw.includes('TOTAL INCOME');
             const isNetProfit = rowRaw.includes('NET PROFIT');
             
             const isExpense = colName === 'Debit' || colName === 'Expense' || isTotalExpense || (isNetProfit && val < 0) || rowRaw.includes('Expense');
             const isIncome = colName === 'Credit' || colName === 'Income' || isTotalIncome || (isNetProfit && val > 0) || rowRaw.includes('Income');
             
             if (isExpense) {
               cellData.cell.styles.textColor = [220, 38, 38]; // Red
             } else if (isIncome) {
               cellData.cell.styles.textColor = [22, 163, 74]; // Green
             }
          }
        }
      }
    }
  });

  doc.save(`${filename}.pdf`);
};
