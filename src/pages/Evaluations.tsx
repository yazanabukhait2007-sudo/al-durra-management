import { useState, useEffect } from "react";
import { DailyEvaluation } from "../types";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Calendar as CalendarIcon, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

import Logo from "../components/Logo";

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState<DailyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvaluations();
  }, [month]);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/evaluations?month=${month}`);
      const data = await res.json();
      setEvaluations(data);
    } catch (error) {
      console.error("Failed to fetch evaluations", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvaluation = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;
    try {
      const res = await fetch(`/api/evaluations/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEvaluations();
      }
    } catch (error) {
      console.error("Failed to delete evaluation", error);
    }
  };

  return (
    <div dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">التقييمات اليومية</h1>
          <Logo className="scale-75 origin-right hidden sm:flex" />
        </div>
        <Link
          to="/evaluations/new"
          className="bg-durra-green text-white px-6 py-2 rounded-lg hover:bg-durra-green-light flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          إضافة تقييم جديد
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تصفية حسب الشهر
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CalendarIcon className="h-5 w-5 text-durra-green" />
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full pl-4 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-gray-50 text-gray-700 font-medium transition-all hover:border-durra-green/50"
            />
          </div>
        </div>
        <button
          onClick={fetchEvaluations}
          className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 flex items-center gap-2 transition-colors w-full sm:w-auto justify-center font-medium"
        >
          <Search className="w-5 h-5" />
          بحث
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">التاريخ</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">العامل</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-32">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            ) : evaluations.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">لا يوجد تقييمات مسجلة في هذا الشهر</td>
              </tr>
            ) : (
              evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {evaluation.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {evaluation.worker_name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/evaluations/edit/${evaluation.id}`)}
                        className="text-durra-green hover:text-durra-green-light p-2 rounded-lg hover:bg-durra-green/10 transition-colors"
                        title="تعديل"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteEvaluation(evaluation.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
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
