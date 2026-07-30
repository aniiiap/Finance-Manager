import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "./button";
import { exportToExcel, exportToPdf } from "../../utils/exportUtils";
import { useData } from "../../context/DataContext";

export function ExportButtons({ data, columns, filename, title = "", hidePdf = false, hideExcel = false }) {
  const { companyInfo } = useData();
  const companyName = companyInfo?.company_name || '';

  const handleExcel = () => {
    exportToExcel(data, filename, companyName);
  };

  const handlePdf = () => {
    exportToPdf(data, columns, filename, title || filename, companyName);
  };

  return (
    <div className="flex gap-2">
      {!hideExcel && (
        <Button 
          variant="outline" 
          onClick={handleExcel} 
          disabled={!data || data.length === 0}
          title="Export to Excel"
          className="flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          <span className="hidden sm:inline">Excel</span>
        </Button>
      )}
      {!hidePdf && (
        <Button 
          variant="outline" 
          onClick={handlePdf} 
          disabled={!data || data.length === 0}
          title="Export to PDF"
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4 text-red-600" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
      )}
    </div>
  );
}
