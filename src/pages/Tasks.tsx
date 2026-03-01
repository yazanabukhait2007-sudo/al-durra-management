import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { Plus, Trash2, Edit2, X, Save } from "lucide-react";

import Logo from "../components/Logo";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

import { fetchWithAuth } from "../utils/api";

export default function Tasks() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTargetQuantity, setNewTargetQuantity] = useState("");
  const [loading, setLoading] = useState(true);

  const [editModal, setEditModal] = useState<{isOpen: boolean, task: Task | null}>({
    isOpen: false,
    task: null
  });

  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");

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
        showToast("تم إضافة المهمة بنجاح", "success");
      } else {
        showToast("فشل إضافة المهمة، قد يكون الاسم موجوداً مسبقاً", "error");
      }
    } catch (error) {
      console.error("Failed to add task", error);
      showToast("حدث خطأ في الاتصال", "error");
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
        showToast("تم حذف المهمة بنجاح", "success");
      } else {
        showToast("حدث خطأ أثناء حذف المهمة", "error");
      }
    } catch (error) {
      console.error("Failed to delete task", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const openEditModal = (task: Task) => {
    setEditModal({ isOpen: true, task });
    setEditName(task.name);
    setEditTarget(task.target_quantity.toString());
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.task || !editName.trim() || !editTarget) return;

    try {
      const res = await fetchWithAuth(`/api/tasks/${editModal.task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          target_quantity: parseInt(editTarget, 10),
        }),
      });
      if (res.ok) {
        setEditModal({ isOpen: false, task: null });
        fetchTasks();
        showToast("تم تحديث المهمة بنجاح", "success");
      } else {
        showToast("فشل تحديث المهمة", "error");
      }
    } catch (error) {
      console.error("Failed to update task", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const canAdd = user?.role === 'admin' || user?.permissions.includes('add_task');
  const canDelete = user?.role === 'admin' || user?.permissions.includes('delete_task');

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة الأعمال (المهام)</h1>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      {canAdd && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">إضافة مهمة جديدة</h2>
          <form onSubmit={addTask} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="اسم المهمة (مثال: بحث بلور 1375 مل)..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
              required
            />
            <input
              type="number"
              value={newTargetQuantity}
              onChange={(e) => setNewTargetQuantity(e.target.value)}
              placeholder="الهدف..."
              className="w-full md:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
              required
              min="1"
            />
            <button
              type="submit"
              className="bg-durra-green text-white px-8 py-2 rounded-xl hover:bg-durra-green-light flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 font-bold"
            >
              <Plus className="w-5 h-5" />
              إضافة
            </button>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">الرقم</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">المهمة</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">الهدف</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-32">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">لا يوجد مهام مسجلة</td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{task.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{task.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <span className="bg-durra-green/10 dark:bg-durra-green/20 text-durra-green dark:text-durra-green-light px-3 py-1 rounded-full font-medium">
                      {task.target_quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {canAdd && (
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="تعديل"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => confirmDelete(task.id, task.name)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
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

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">تعديل المهمة</h3>
                <button 
                  onClick={() => setEditModal({ isOpen: false, task: null })}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">اسم المهمة</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">الهدف</label>
                  <input
                    type="number"
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                    required
                    min="1"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-durra-green text-white px-6 py-2.5 rounded-xl hover:bg-durra-green-light transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    حفظ التغييرات
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditModal({ isOpen: false, task: null })}
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
