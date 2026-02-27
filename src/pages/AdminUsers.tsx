import React, { useState, useEffect } from "react";
import { User } from "../types";
import { Check, X, Shield, Trash2 } from "lucide-react";
import Logo from "../components/Logo";
import ConfirmModal from "../components/ConfirmModal";
import { fetchWithAuth } from "../utils/api";

const AVAILABLE_PERMISSIONS = [
  { id: "manage_workers", label: "إدارة العمال (إضافة/حذف)" },
  { id: "manage_tasks", label: "إدارة المهام (إضافة/حذف)" },
  { id: "manage_evaluations", label: "إدارة التقييمات (إضافة/تعديل/حذف)" },
  { id: "view_reports", label: "عرض التقارير وتصديرها" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [rejectModal, setRejectModal] = useState<{isOpen: boolean, id: number | null}>({ isOpen: false, id: null });
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

  const handleApprove = async (id: number) => {
    try {
      const res = await fetchWithAuth(`/api/admin/users/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });
      if (res.ok) {
        setSelectedUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error("Failed to approve user", error);
    }
  };

  const confirmReject = (id: number) => setRejectModal({ isOpen: true, id });
  const executeReject = async () => {
    if (!rejectModal.id) return;
    try {
      const res = await fetchWithAuth(`/api/admin/users/${rejectModal.id}/reject`, {
        method: "PUT",
      });
      if (res.ok) {
        fetchUsers();
      } else {
        alert("حدث خطأ أثناء رفض المستخدم.");
      }
    } catch (error) {
      console.error("Failed to reject user", error);
      alert("حدث خطأ في الاتصال.");
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
      } else {
        alert("حدث خطأ أثناء حذف المستخدم.");
      }
    } catch (error) {
      console.error("Failed to delete user", error);
      alert("حدث خطأ في الاتصال.");
    }
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const openApproveModal = (user: User) => {
    setSelectedUser(user);
    setSelectedPermissions(user.permissions || []);
  };

  return (
    <div dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين والصلاحيات</h1>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">اسم المستخدم</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الحالة</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">الصلاحيات</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 w-48">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">لا يوجد مستخدمين</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{user.username}</td>
                  <td className="px-6 py-4 text-sm">
                    {user.status === "pending" && (
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium text-xs">قيد الانتظار</span>
                    )}
                    {user.status === "approved" && (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium text-xs">مقبول</span>
                    )}
                    {user.status === "rejected" && (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium text-xs">مرفوض</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.status === "approved" ? (
                      <div className="flex flex-wrap gap-1">
                        {user.permissions.length > 0 ? (
                          user.permissions.map((p) => (
                            <span key={p} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">
                              {AVAILABLE_PERMISSIONS.find((ap) => ap.id === p)?.label || p}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">لا يوجد صلاحيات</span>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {user.status !== "approved" && (
                        <button
                          onClick={() => openApproveModal(user)}
                          className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors"
                          title="قبول وتحديد الصلاحيات"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      {user.status === "approved" && (
                        <button
                          onClick={() => openApproveModal(user)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          title="تعديل الصلاحيات"
                        >
                          <Shield className="w-5 h-5" />
                        </button>
                      )}
                      {user.status !== "rejected" && (
                        <button
                          onClick={() => confirmReject(user.id)}
                          className="text-orange-500 hover:text-orange-700 p-2 rounded-lg hover:bg-orange-50 transition-colors"
                          title="رفض"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(user.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
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
        isOpen={rejectModal.isOpen}
        title="رفض المستخدم"
        message="هل أنت متأكد من رفض هذا المستخدم؟ لن يتمكن من الدخول للنظام."
        confirmText="نعم، ارفض المستخدم"
        onConfirm={executeReject}
        onCancel={() => setRejectModal({ isOpen: false, id: null })}
      />

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {selectedUser.status === "approved" ? "تعديل صلاحيات" : "قبول وتحديد صلاحيات"} {selectedUser.username}
            </h3>
            
            <div className="space-y-3 mb-6">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label key={perm.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="w-5 h-5 text-durra-green rounded border-gray-300 focus:ring-durra-green"
                  />
                  <span className="text-gray-800 font-medium">{perm.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleApprove(selectedUser.id)}
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
