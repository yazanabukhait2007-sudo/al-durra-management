import React, { useState, useEffect } from "react";
import { User } from "../types";
import { Shield, Trash2 } from "lucide-react";
import Logo from "../components/Logo";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import { fetchWithAuth } from "../utils/api";

const AVAILABLE_PERMISSIONS = [
  { id: "view_dashboard", label: "عرض لوحة القيادة والإحصائيات" },
  { id: "view_workers", label: "عرض قائمة العمال" },
  { id: "view_worker_details", label: "عرض تفاصيل العامل (بدون تعديل)" },
  { id: "add_worker", label: "إضافة عامل جديد" },
  { id: "edit_worker", label: "تعديل بيانات عامل" },
  { id: "delete_worker", label: "حذف عامل" },
  { id: "view_tasks", label: "عرض قائمة المهام" },
  { id: "add_task", label: "إضافة مهمة جديدة" },
  { id: "edit_task", label: "تعديل مهمة" },
  { id: "delete_task", label: "حذف مهمة" },
  { id: "view_evaluations", label: "عرض التقييمات" },
  { id: "add_evaluation", label: "إضافة تقييم جديد" },
  { id: "edit_evaluation", label: "تعديل تقييم" },
  { id: "delete_evaluation", label: "حذف تقييم" },
  { id: "view_reports", label: "عرض التقارير وتصديرها" },
  { id: "view_attendance", label: "عرض سجل الحضور والمغادرات" },
  { id: "manage_attendance", label: "إدارة الحضور والمغادرات" },
  { id: "view_account_statements", label: "عرض كشوفات الحساب" },
  { id: "add_transaction", label: "إضافة حركات مالية" },
  { id: "delete_transaction", label: "حذف حركات مالية" },
  { id: "export_pdf", label: "تصدير كشوفات الحساب (PDF)" },
  { id: "view_work_logs", label: "عرض سجل العمل التفصيلي" },
  { id: "manage_users", label: "إدارة المستخدمين والصلاحيات" },
  { id: "view_audit_logs", label: "عرض سجل النشاطات (Audit Logs)" },
];

export default function AdminUsers() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({ isOpen: false, id: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermissions = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/admin/users/${id}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      if (res.ok) {
        setSelectedUser(null);
        fetchUsers();
        showToast("تم تحديث الصلاحيات بنجاح", "success");
      } else {
        showToast("فشل تحديث الصلاحيات", "error");
      }
    } catch (error) {
      console.error("Failed to update permissions", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const confirmDelete = (id: number) => setDeleteModal({ isOpen: true, id });
  const executeDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const res = await fetchWithAuth(`/api/admin/users/${deleteModal.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchUsers();
        showToast("تم حذف المستخدم بنجاح", "success");
      } else {
        showToast("حدث خطأ أثناء حذف المستخدم", "error");
      }
    } catch (error) {
      console.error("Failed to delete user", error);
      showToast("حدث خطأ في الاتصال", "error");
    }
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const openPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || []);
  };

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين والصلاحيات</h1>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">اسم المستخدم</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">البريد الإلكتروني</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">الصلاحيات</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-48">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">لا يوجد مستخدمين</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{user.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.email || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.length > 0 ? (
                        user.permissions.map((p) => (
                          <span key={p} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-600">
                            {AVAILABLE_PERMISSIONS.find((ap) => ap.id === p)?.label || p}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">لا يوجد صلاحيات</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPermissionsModal(user)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="تعديل الصلاحيات"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(user.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="حذف نهائي"
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

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف المستخدم"
        message="هل أنت متأكد من حذف هذا المستخدم نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف المستخدم"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {/* Modal for Permissions */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              تعديل صلاحيات {selectedUser.username}
            </h3>
            
            <div className="space-y-3 mb-6 max-h-[60vh] overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label key={perm.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="w-5 h-5 text-durra-green rounded border-gray-300 dark:border-gray-600 focus:ring-durra-green bg-white dark:bg-gray-700"
                  />
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{perm.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleUpdatePermissions(selectedUser.id)}
                className="px-6 py-2 bg-durra-green text-white rounded-lg hover:bg-durra-green-light transition-colors font-bold shadow-sm"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
