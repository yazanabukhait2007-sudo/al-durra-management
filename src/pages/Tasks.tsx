import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { Plus, Trash2 } from "lucide-react";

import Logo from "../components/Logo";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";

import { fetchWithAuth } from "../utils/api";

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTargetQuantity, setNewTargetQuantity] = useState("");
  const [loading, setLoading] = useState(true);

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null, name: string}>({
    isOpen: false,
    id: null,
    name: ""
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetchWithAuth("/api/tasks");
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !newTargetQuantity) return;

    try {
      const res = await fetchWithAuth("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTaskName,
          target_quantity: parseInt(newTargetQuantity, 10),
        }),
      });
      if (res.ok) {
        setNewTaskName("");
        setNewTargetQuantity("");
        fetchTasks();
      } else {
        alert("فشل إضافة المهمة، قد يكون الاسم موجوداً مسبقاً.");
      }
    } catch (error) {
      console.error("Failed to add task", error);
    }
  };

  const confirmDelete = (id: number, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    if (!deleteModal.id) return;
    
    try {
      const res = await fetchWithAuth(`/api/tasks/${deleteModal.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTasks();
      } else {
        alert("حدث خطأ أثناء حذف المهمة.");
      }
    } catch (error) {
      console.error("Failed to delete task", error);
      alert("حدث خطأ في الاتصال.");
    }
  };

  const canAdd = user?.role === 'admin' || user?.permissions.includes('add_task');
  const canDelete = user?.role === 'admin' || user?.permissions.includes('delete_task');

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة الأعمال (المهام)</h1>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      {canAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">إضافة مهمة جديدة</h2>
          <form onSubmit={addTask} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="اسم المهمة (مثال: بحث بلور 1375 مل)..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
              required
            />
            <input
              type="number"
              value={newTargetQuantity}
              onChange={(e) => setNewTargetQuantity(e.target.value)}
              placeholder="الهدف..."
              className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
              required
              min="1"
            />
            <button
              type="submit"
              className="bg-durra-green text-white px-6 py-2 rounded-lg hover:bg-durra-green-light flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              إضافة
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الرقم</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">المهمة</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الهدف</th>
              {canDelete && (
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-24">إجراء</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">لا يوجد مهام مسجلة</td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900">{task.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{task.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className="bg-durra-green/10 text-durra-green px-3 py-1 rounded-full font-medium">
                      {task.target_quantity}
                    </span>
                  </td>
                  {canDelete && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() => confirmDelete(task.id, task.name)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف مهمة"
        message={`⚠️ تحذير ⚠️\n\nهل أنت متأكد من حذف المهمة "${deleteModal.name}"؟\n\nسيؤدي هذا الإجراء إلى حذف المهمة وجميع البيانات المرتبطة بها في التقييمات السابقة.`}
        confirmText="نعم، احذف المهمة"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: "" })}
      />
    </div>
  );
}
