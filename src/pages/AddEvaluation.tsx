import React, { useState, useEffect } from "react";
import { Worker, Task } from "../types";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Trash2, Save, ArrowRight, Calendar } from "lucide-react";

import Logo from "../components/Logo";

export default function AddEvaluation() {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [entries, setEntries] = useState<{ task_id: string; quantity: string }[]>([
    { task_id: "", quantity: "" },
  ]);

  useEffect(() => {
    fetchWorkers();
    fetchTasks();
  }, []);

  const fetchWorkers = async () => {
    const res = await fetch("/api/workers");
    setWorkers(await res.json());
  };

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
  };

  const handleAddEntry = () => {
    setEntries([...entries, { task_id: "", quantity: "" }]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleEntryChange = (index: number, field: "task_id" | "quantity", value: string) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWorker || !date) {
      alert("الرجاء اختيار العامل والتاريخ");
      return;
    }

    const validEntries = entries.filter((e) => e.task_id && e.quantity);
    if (validEntries.length === 0) {
      alert("الرجاء إضافة مهمة واحدة على الأقل مع الكمية");
      return;
    }

    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: parseInt(selectedWorker, 10),
          date,
          entries: validEntries.map((e) => ({
            task_id: parseInt(e.task_id, 10),
            quantity: parseInt(e.quantity, 10),
          })),
        }),
      });

      if (res.ok) {
        navigate("/evaluations");
      } else {
        const errorData = await res.json();
        alert(errorData.error || "حدث خطأ أثناء حفظ التقييم");
      }
    } catch (error) {
      console.error("Failed to save evaluation", error);
      alert("حدث خطأ في الاتصال");
    }
  };

  return (
    <div dir="rtl" className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/evaluations")}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors text-gray-600"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">إضافة تقييم يومي جديد</h1>
        </div>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                العامل
              </label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-gray-50"
                required
              >
                <option value="">-- اختر العامل --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                التاريخ
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-durra-green" />
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-4 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-gray-50 text-gray-700 font-medium transition-all hover:border-durra-green/50"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">الأعمال المنجزة</h2>
              <button
                type="button"
                onClick={handleAddEntry}
                className="text-durra-green hover:text-durra-green-light font-medium flex items-center gap-2 text-sm bg-durra-green/10 px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                إضافة مهمة أخرى
              </button>
            </div>

            <div className="space-y-4">
              {entries.map((entry, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-gray-50 p-4 rounded-xl border border-gray-100"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      المهمة
                    </label>
                    <select
                      value={entry.task_id}
                      onChange={(e) => handleEntryChange(index, "task_id", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-white"
                      required
                    >
                      <option value="">-- اختر المهمة --</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (الهدف: {t.target_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      الكمية المنجزة
                    </label>
                    <input
                      type="number"
                      value={entry.quantity}
                      onChange={(e) => handleEntryChange(index, "quantity", e.target.value)}
                      placeholder="الكمية..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none bg-white"
                      required
                      min="0"
                    />
                  </div>

                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      className="p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              className="bg-durra-green text-white px-8 py-3 rounded-xl hover:bg-durra-green-light flex items-center gap-2 font-bold shadow-md shadow-durra-green/20 transition-all active:scale-95"
            >
              <Save className="w-5 h-5" />
              حفظ التقييم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
