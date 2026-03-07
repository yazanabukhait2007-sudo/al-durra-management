import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../utils/api";
import { Search, Edit, Trash2, Box, FileText, CheckCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import ConfirmModal from "../components/ConfirmModal";
import CustomDatePicker from "../components/CustomDatePicker";

export default function ProductionManagement() {
  const [pallets, setPallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; pallet: any | null }>({ isOpen: false, pallet: null });
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    fetchPallets();
  }, []);

  const fetchPallets = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/production/pallets");
      const data = await res.json();
      setPallets(data);
    } catch (error) {
      console.error("Error fetching pallets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await fetchWithAuth(`/api/production/pallets/${deleteModal.id}`, {
        method: "DELETE",
      });
      setPallets(pallets.filter((p) => p.id !== deleteModal.id));
      setDeleteModal({ isOpen: false, id: null });
    } catch (error) {
      console.error("Error deleting pallet:", error);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  const openEditModal = (pallet: any) => {
    let certData = {};
    try {
      if (typeof pallet.certificate_data === 'string') {
        certData = JSON.parse(pallet.certificate_data);
      } else {
        certData = pallet.certificate_data || {};
      }
    } catch (e) {
      console.error(e);
    }
    setEditFormData(certData);
    setEditModal({ isOpen: true, pallet });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.pallet) return;
    
    try {
      const updatedPallet = {
        ...editModal.pallet,
        certificate_data: editFormData
      };

      await fetchWithAuth(`/api/production/pallets/${editModal.pallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPallet),
      });

      // Update local state with stringified version for consistency with how it was fetched
      const localUpdatedPallet = {
        ...editModal.pallet,
        certificate_data: JSON.stringify(editFormData)
      };
      setPallets(pallets.map(p => p.id === editModal.pallet.id ? localUpdatedPallet : p));
      setEditModal({ isOpen: false, pallet: null });
    } catch (error) {
      console.error("Error updating pallet:", error);
      alert("حدث خطأ أثناء التحديث");
    }
  };

  const filteredPallets = pallets.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Box className="w-8 h-8 text-blue-600" />
            إدارة الإنتاج
          </h1>
          <p className="text-gray-500 mt-2">إدارة جميع الطبالي والشهادات المنتجة</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="البحث برقم الطبلية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600">رقم الطبلية</th>
                <th className="p-4 font-semibold text-gray-600">القسم</th>
                <th className="p-4 font-semibold text-gray-600">الصنف</th>
                <th className="p-4 font-semibold text-gray-600">تاريخ الإنتاج</th>
                <th className="p-4 font-semibold text-gray-600">الحالة</th>
                <th className="p-4 font-semibold text-gray-600 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                </tr>
              ) : filteredPallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">لا توجد طبالي مطابقة للبحث</td>
                </tr>
              ) : (
                filteredPallets.map((pallet) => {
                  let certData: any = {};
                  try {
                    certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data || {};
                  } catch (e) {}

                  return (
                    <tr key={pallet.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-4 font-mono font-medium text-blue-600">{pallet.id}</td>
                      <td className="p-4">{pallet.type === 'tomato' ? 'قسم البندورة' : pallet.type === 'ketchup' ? 'قسم الكاتشب' : pallet.type}</td>
                      <td className="p-4">{certData.item_name || '-'}</td>
                      <td className="p-4">{certData.production_date || '-'}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          pallet.status === 'produced' ? 'bg-blue-100 text-blue-800' :
                          pallet.status === 'in_packaging' ? 'bg-purple-100 text-purple-800' :
                          pallet.status === 'in_warehouse' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pallet.status === 'produced' ? 'في الإنتاج' :
                           pallet.status === 'in_packaging' ? 'في التغليف' :
                           pallet.status === 'in_warehouse' ? 'في المستودع' : pallet.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(pallet)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, id: pallet.id })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف الطبلية"
        message={`هل أنت متأكد من حذف الطبلية رقم ${deleteModal.id}؟ سيتم حذف كافة البيانات المرتبطة بها نهائياً.`}
        confirmText="نعم، احذف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-gray-100 text-right"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">تعديل الشهادة</h3>
                  <p className="text-sm text-gray-500">رقم: {editModal.pallet?.id}</p>
                </div>
              </div>
              <button onClick={() => setEditModal({ isOpen: false, pallet: null })} className="text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full shadow-sm border border-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <CustomDatePicker
                    label="التاريخ"
                    value={editFormData.date || ''}
                    onChange={(date) => setEditFormData({ ...editFormData, date })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                  <input
                    type="text"
                    value={editFormData.department || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">إلى مستودع</label>
                  <input
                    type="text"
                    value={editFormData.warehouse_target || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, warehouse_target: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم شهادة المطابقة</label>
                  <input
                    type="text"
                    value={editFormData.certificate_number || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, certificate_number: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                  <input
                    type="text"
                    value={editFormData.item_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, item_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وزن التعبئة</label>
                  <input
                    type="text"
                    value={editFormData.filling_weight || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, filling_weight: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين</label>
                  <input
                    type="number"
                    value={editFormData.carton_count || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, carton_count: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الخلطة</label>
                  <input
                    type="text"
                    value={editFormData.batch_number || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, batch_number: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <CustomDatePicker
                    label="تاريخ الإنتاج"
                    value={editFormData.production_date || ''}
                    onChange={(date) => setEditFormData({ ...editFormData, production_date: date })}
                  />
                </div>
                <div>
                  <CustomDatePicker
                    label="تاريخ الانتهاء"
                    value={editFormData.expiry_date || ''}
                    onChange={(date) => setEditFormData({ ...editFormData, expiry_date: date })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModal({ isOpen: false, pallet: null })}
                  className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-blue-200"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
