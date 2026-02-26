import { useState, useEffect } from "react";
import { MonthlyReportItem } from "../types";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import Logo from "../components/Logo";

export default function MonthlyReport() {
  const [report, setReport] = useState<MonthlyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));

  useEffect(() => {
    fetchReport();
  }, [month]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/monthly?month=${month}`);
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch report", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add font for Arabic support (using a standard font or base64 if needed)
    // For simplicity, we'll use English headers or basic text, but ideally you'd load an Arabic font.
    // Since jsPDF default fonts don't support Arabic well without custom fonts, 
    // we will use English headers for the PDF or simple Latin characters if Arabic fails.
    // Let's try to use basic text.
    doc.setFont("helvetica");
    
    doc.text(`Monthly Report - ${month}`, 14, 15);
    
    const tableColumn = ["Worker Name", "Days Worked", "Average Score"];
    const tableRows: any[] = [];

    report.forEach(r => {
      const rowData = [
        r.worker_name,
        r.days_worked,
        r.average_score ? r.average_score.toFixed(2) + "%" : "0%"
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { font: "helvetica" },
      headStyles: { fillColor: [0, 104, 56] } // durra-green
    });

    doc.save(`Durra_Report_${month}.pdf`);
  };

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">التقرير الشهري</h1>
          <Logo className="scale-75 origin-right hidden sm:flex" />
        </div>
        <button
          onClick={exportToPDF}
          disabled={report.length === 0}
          className="bg-durra-green text-white px-6 py-2 rounded-lg hover:bg-durra-green-light flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          تصدير PDF
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الشهر
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">العامل</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">أيام العمل</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">متوسط التقييم الشهري</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            ) : report.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">لا يوجد بيانات لهذا الشهر</td>
              </tr>
            ) : (
              report.map((item) => (
                <tr key={item.worker_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {item.worker_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="bg-durra-green/10 text-durra-green px-3 py-1 rounded-full font-medium">
                      {item.days_worked} أيام
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.average_score !== null ? (
                      <div className="flex items-center gap-3">
                        <div className="w-full max-w-[150px] bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              item.average_score >= 80 ? 'bg-durra-green' :
                              item.average_score >= 50 ? 'bg-durra-green-light' : 'bg-durra-red'
                            }`}
                            style={{ width: `${Math.min(item.average_score, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          {item.average_score.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 italic">لم يعمل</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
