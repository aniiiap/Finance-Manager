import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
export const exportToPdf = (data, columns, filename, title = '', companyName = '') => {
  if (!data || data.length === 0) return;
  
  const doc = new jsPDF();
  
  let startY = 14;
  if (companyName) {
    doc.setFontSize(16);
    doc.text(companyName, 14, startY);
    startY += 8;
  }
  
  if (title) {
    doc.setFontSize(12);
    doc.text(title, 14, startY);
    startY += 8;
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
    styles: { fontSize: 8 }
  });

  doc.save(`${filename}.pdf`);
};
