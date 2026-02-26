import React, { useState, useEffect } from "react";
import { Worker } from "../types";
import { Plus, Trash2 } from "lucide-react";

import Logo from "../components/Logo";

export default function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await fetch("/api/workers");
      const data = await res.json();
      setWorkers(data);
    } catch (error) {
      console.error("Failed to fetch workers", error);
    } finally {
      setLoading(false);
    }
  };

  const addWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkerName }),
      });
      if (res.ok) {
        setNewWorkerName("");
        fetchWorkers();
      } else {
        alert("فشل إضافة العامل، قد يكون الاسم موجوداً مسبقاً.");
      }
    } catch (error) {
      console.error("Failed to add worker", error);
    }
  };

  const deleteWorker = async (id: number, name: string) => {
    const isConfirmed = window.confirm(
      `⚠️ تحذير خطير ⚠️\n\nهل أنت متأكد من حذف العامل "${name}"؟\n\nسيؤدي هذا الإجراء إلى حذف العامل وجميع التقييمات والبيانات السابقة المرتبطة به نهائياً، ولن تتمكن من استرجاعها.`
    );
    
    if (!isConfirmed) return;
    
    try {
      const res = await fetch(`/api/workers/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchWorkers();
      } else {
        alert("حدث خطأ أثناء حذف العامل.");
      }
    } catch (error) {
      console.error("Failed to delete worker", error);
      alert("حدث خطأ في الاتصال.");
    }
  };

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة العمال</h1>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">إضافة عامل جديد</h2>
        <form onSubmit={addWorker} className="flex gap-4">
          <input
            type="text"
            value={newWorkerName}
            onChange={(e) => setNewWorkerName(e.target.value)}
            placeholder="اسم العامل..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
            required
          />
          <button
            type="submit"
            className="bg-durra-green text-white px-6 py-2 rounded-lg hover:bg-durra-green-light flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            إضافة
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الرقم</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الاسم</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-24">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            ) : workers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">لا يوجد عمال مسجلين</td>
              </tr>
            ) : (
              workers.map((worker) => (
                <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{worker.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{worker.name}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => deleteWorker(worker.id, worker.name)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
