import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Package, CheckCircle, AlertCircle, ArrowRight, Truck, Barcode, ClipboardCheck, Play, Box, List, History, Search, FileText, BarChart3, Edit2, Trash2, X } from "lucide-react";
import { fetchWithAuth } from "../utils/api";
import CustomDatePicker from "../components/CustomDatePicker";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";

interface Pallet {
  id: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  certificate_data?: string;
  packaging_certificate_data?: string;
}

const PackagingDepartment = () => {
  const [activeTab, setActiveTab] = useState<'operations' | 'inventory'>('operations');
  const [incomingPallets, setIncomingPallets] = useState<Pallet[]>([]);
  const [stockPallets, setStockPallets] = useState<Pallet[]>([]);
  const [processingPallets, setProcessingPallets] = useState<Pallet[]>([]);
  const [allPallets, setAllPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [showCertModal, setShowCertModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [palletToAction, setPalletToAction] = useState<Pallet | null>(null);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [certFormData, setCertFormData] = useState<any>({});
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();

  // Edit/Delete State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string | null}>({
    isOpen: false,
    id: null
  });

  // Permissions
  const userPermissions = JSON.parse(localStorage.getItem('user_permissions') || '[]');
  const canEdit = userPermissions.includes('edit_production') || userPermissions.includes('admin');
  const canDelete = userPermissions.includes('delete_production') || userPermissions.includes('admin');

  const safeParse = (data: any) => {
    if (!data) return {};
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  };

  const getDetailedStats = (pallets: Pallet[]) => {
    const stats: Record<string, { 
      today: number, 
      week: number, 
      month: number, 
      threeMonths: number, 
      sixMonths: number, 
      year: number 
    }> = {};

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const startOfThreeMonths = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const startOfSixMonths = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const startOfYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    pallets.forEach(p => {
      const packCert = safeParse(p.packaging_certificate_data);
      const prodCert = safeParse(p.certificate_data);
      const itemName = packCert.item_name || prodCert.item_name || 'غير محدد';
      const prodDateStr = packCert.production_date || prodCert.production_date;
      const prodDate = prodDateStr ? new Date(prodDateStr) : (p.created_at ? new Date(p.created_at) : null);

      if (!stats[itemName]) {
        stats[itemName] = { today: 0, week: 0, month: 0, threeMonths: 0, sixMonths: 0, year: 0 };
      }

      if (prodDate) {
        if (prodDate >= startOfDay) stats[itemName].today++;
        if (prodDate >= startOfWeek) stats[itemName].week++;
        if (prodDate >= startOfMonth) stats[itemName].month++;
        if (prodDate >= startOfThreeMonths) stats[itemName].threeMonths++;
        if (prodDate >= startOfSixMonths) stats[itemName].sixMonths++;
        if (prodDate >= startOfYear) stats[itemName].year++;
      }
    });

    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    loadIncomingPallets();
    loadStockPallets();
    loadProcessingPallets();
    loadAllPallets();
  };

  const loadAllPallets = async () => {
    try {
      const res = await fetchWithAuth("/api/production/pallets?type=all");
      if (res.ok) {
        const data = await res.json();
        setAllPallets(data);
      }
    } catch (err) {
      console.error("Failed to load all pallets", err);
    }
  };

  const loadIncomingPallets = async () => {
    try {
      const res = await fetchWithAuth("/api/packaging/incoming");
      if (res.ok) {
        const data = await res.json();
        setIncomingPallets(data);
      }
    } catch (err) {
      console.error("Failed to load incoming pallets", err);
    }
  };

  const loadStockPallets = async () => {
    try {
      const res = await fetchWithAuth("/api/packaging/stock");
      if (res.ok) {
        const data = await res.json();
        setStockPallets(data);
      }
    } catch (err) {
      console.error("Failed to load stock pallets", err);
    }
  };

  const loadProcessingPallets = async () => {
    try {
      const res = await fetchWithAuth("/api/packaging/processing");
      if (res.ok) {
        const data = await res.json();
        setProcessingPallets(data);
      }
    } catch (err) {
      console.error("Failed to load processing pallets", err);
    }
  };

  const handleReceivePallet = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/packaging/receive/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error("فشل في استلام الطبلية");
      setSuccess(`تم استلام الطبلية ${id} وإضافتها للمخزون`);
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStartPackaging = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/packaging/start/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error("فشل في بدء التغليف");
      setSuccess(`تم بدء تغليف الطبلية ${id}`);
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openCertModal = (pallet: Pallet) => {
    setSelectedPallet(pallet);
    
    let prodCert: any = {};
    try {
      if (pallet.certificate_data) {
        prodCert = JSON.parse(pallet.certificate_data);
      }
    } catch (e) {}

    setCertFormData({
      date: new Date().toISOString().split('T')[0],
      department: 'قسم التغليف',
      item_name: prodCert.item_name || '',
      filling_weight: prodCert.filling_weight || '',
      carton_count: prodCert.carton_count || '',
      batch_number: prodCert.batch_number || '',
      production_date: prodCert.production_date || '',
      expiry_date: prodCert.expiry_date || '',
      certificate_number: prodCert.certificate_number || '',
      warehouse_target: prodCert.warehouse_target || '',
      supervisor_name: '',
      notes: ''
    });
    setShowCertModal(true);
  };

  const handleFinishPackaging = async () => {
    if (!selectedPallet) return;
    
    try {
      const certificateData = {
        ...certFormData,
        signatures: {
          supervisor: {
            signed: true,
            name: certFormData.supervisor_name,
            date: new Date().toISOString()
          },
          qc: { signed: false },
          warehouse: { signed: false },
          quality_officer: { signed: false }
        }
      };

      const res = await fetchWithAuth(`/api/packaging/finish/${selectedPallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packaging_certificate_data: certificateData })
      });

      if (!res.ok) throw new Error("فشل في إنهاء التغليف");
      
      setSuccess(`تم إنهاء تغليف الطبلية ${selectedPallet.id} وإنشاء الشهادة`);
      setShowCertModal(false);
      setSelectedPallet(null);
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmSendToWarehouse = async () => {
    if (!palletToAction) return;
    try {
      const res = await fetchWithAuth(`/api/packaging/warehouse/${palletToAction.id}`, { method: "PUT" });
      if (!res.ok) throw new Error("فشل في الإرسال للمستودع");

      // Create a warehouse request
      await fetchWithAuth("/api/warehouse/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pallet_id: palletToAction.id,
          status: "pending"
        }),
      });

      setSuccess(`تم إرسال الطبلية ${palletToAction.id} إلى المستودع`);
      setShowSendModal(false);
      setPalletToAction(null);
      loadAllData();
    } catch (err: any) {
      setError(err.message);
      setShowSendModal(false);
    }
  };

  const handleEditClick = (pallet: Pallet) => {
    setSelectedPallet(pallet);
    setEditFormData({
      details: pallet.details,
      type: pallet.type,
      certificate_data: safeParse(pallet.certificate_data),
      packaging_certificate_data: safeParse(pallet.packaging_certificate_data)
    });
    setShowEditModal(true);
  };

  const handleUpdatePallet = async () => {
    if (!selectedPallet) return;
    try {
      const res = await fetchWithAuth(`/api/production/pallets/${selectedPallet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          details: editFormData.details,
          type: editFormData.type,
          certificate_data: editFormData.certificate_data,
          packaging_certificate_data: editFormData.packaging_certificate_data
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل في تحديث البيانات');
      }

      showToast('تم تحديث بيانات الطبلية بنجاح', 'success');
      setShowEditModal(false);
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const res = await fetchWithAuth(`/api/production/pallets/${deleteModal.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل في حذف الطبلية');
      }

      showToast('تم حذف الطبلية بنجاح', 'success');
      setDeleteModal({ isOpen: false, id: null });
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSendToWarehouse = (pallet: Pallet) => {
    let qcSigned = false;
    try {
      const cert = JSON.parse(pallet.packaging_certificate_data || '{}');
      qcSigned = cert?.signatures?.qc?.signed;
    } catch (e) {}

    if (!qcSigned) {
      setError("يجب توقيع مراقب الجودة قبل الإرسال للمستودع");
      return;
    }

    setPalletToAction(pallet);
    setShowSendModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">قسم التغليف 📦</h1>
          <p className="text-gray-500 mt-2">استلام الإنتاج، المخزون، التغليف، وإصدار الشهادات</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('operations'); setSearchTerm(""); }}
          className={`pb-4 px-2 font-bold transition-colors flex items-center gap-2 ${activeTab === 'operations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Package className="w-5 h-5" />
          عمليات التغليف
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-4 px-2 font-bold transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <History className="w-5 h-5" />
          جرد الطبالي
        </button>
      </div>

      {activeTab === 'operations' ? (
        <>
      {/* Incoming Pallets Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" />
          الوارد من الإنتاج (جاهز للاستلام)
        </h2>
        
        {incomingPallets.length === 0 ? (
          <p className="text-gray-500 text-center py-4">لا يوجد طبالي واردة حالياً</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {incomingPallets.map((pallet) => (
              <div key={pallet.id} className="border p-4 rounded-lg hover:shadow-md transition-shadow bg-blue-50/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-lg text-blue-700">{pallet.id}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">وارد جديد</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{pallet.details}</p>
                <button
                  onClick={() => handleReceivePallet(pallet.id)}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  استلام للمخزون
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Stock Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Box className="w-5 h-5 text-orange-600" />
          مخزون التغليف (بانتظار التغليف)
        </h2>
        
        {stockPallets.length === 0 ? (
          <p className="text-gray-500 text-center py-4">المخزون فارغ</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stockPallets.map((pallet) => (
              <div key={pallet.id} className="border p-4 rounded-lg hover:shadow-md transition-shadow bg-orange-50/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-lg text-orange-700">{pallet.id}</span>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">في المخزون</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{pallet.details}</p>
                <button
                  onClick={() => handleStartPackaging(pallet.id)}
                  className="w-full bg-orange-600 text-white py-2 rounded-md hover:bg-orange-700 transition-colors flex justify-center items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  بدء التغليف
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Processing Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-yellow-600" />
            عمليات التغليف الجارية والمنتهية
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">كود الطبلية</th>
                <th className="px-6 py-3 font-medium">التفاصيل</th>
                <th className="px-6 py-3 font-medium">الحالة</th>
                <th className="px-6 py-3 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processingPallets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    لا يوجد طبالي قيد المعالجة
                  </td>
                </tr>
              ) : (
                processingPallets.map((pallet) => {
                  let qcSigned = false;
                  try {
                    const cert = JSON.parse(pallet.packaging_certificate_data || '{}');
                    qcSigned = cert?.signatures?.qc?.signed;
                  } catch (e) {}

                  return (
                    <tr key={pallet.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-800 font-medium">{pallet.id}</td>
                      <td className="px-6 py-4 text-gray-600">{pallet.details}</td>
                      <td className="px-6 py-4">
                        {pallet.status === 'packaging_in_progress' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            قيد التغليف
                          </span>
                        )}
                        {pallet.status === 'packaging_done' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            تم التغليف (بانتظار الجودة)
                          </span>
                        )}
                        {pallet.status === 'packaging_qc_approved' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            جاهز للمستودع
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {pallet.status === 'packaging_in_progress' && (
                          <button
                            onClick={() => openCertModal(pallet)}
                            className="text-sm text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                          >
                            <ClipboardCheck className="w-3 h-3" />
                            إنهاء وإصدار شهادة
                          </button>
                        )}
                        {(pallet.status === 'packaging_qc_approved') && (
                          <button
                            onClick={() => handleSendToWarehouse(pallet)}
                            className="text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                          >
                            <Truck className="w-3 h-3" />
                            إرسال للمستودع
                          </button>
                        )}
                        {pallet.status === 'packaging_done' && (
                          <span className="text-xs text-gray-400 italic">بانتظار فحص الجودة</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : (
        <div className="space-y-8">
          {/* Summary Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الطبالي القادمة (بندورة)</p>
                <p className="text-2xl font-bold text-blue-700">{allPallets.filter(p => p.type === 'tomato').length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-xl">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الطبالي المرسلة للمستودع</p>
                <p className="text-2xl font-bold text-green-700">
                  {allPallets.filter(p => p.packaging_certificate_data && (p.status === 'in_warehouse' || p.status === 'awaiting_quality_officer' || p.status === 'packaging_qc_approved')).length}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Production Summary Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Incoming from Tomato Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-800 text-lg">ملخص الطبالي القادمة (بندورة)</h3>
                </div>
                <span className="text-xs text-gray-400 font-medium italic">إحصائيات زمنية تلقائية</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-600 text-sm">
                      <th className="p-3 font-semibold border-b border-gray-100">الصنف</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">اليوم</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">أسبوع</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">شهر</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">3 أشهر</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">6 أشهر</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">سنة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {getDetailedStats(allPallets.filter(p => p.type === 'tomato')).length > 0 ? (
                      getDetailedStats(allPallets.filter(p => p.type === 'tomato')).map((stat, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="p-3 text-gray-700 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-125 transition-transform"></span>
                            {stat.name}
                          </td>
                          <td className="p-3 text-center"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold text-sm">{stat.today}</span></td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.week}</td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.month}</td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.threeMonths}</td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.sixMonths}</td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.year}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400 italic">لا توجد بيانات إحصائية حالياً</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sent to Warehouse Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-green-50 to-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-gray-800 text-lg">ملخص الطبالي المرسلة للمستودع</h3>
                </div>
                <span className="text-xs text-gray-400 font-medium italic">إحصائيات زمنية تلقائية</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-600 text-sm">
                      <th className="p-3 font-semibold border-b border-gray-100">الصنف</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">اليوم</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">أسبوع</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">شهر</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">3 أشهر</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">6 أشهر</th>
                      <th className="p-3 font-semibold border-b border-gray-100 text-center">سنة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {getDetailedStats(allPallets.filter(p => p.packaging_certificate_data && (p.status === 'in_warehouse' || p.status === 'awaiting_quality_officer' || p.status === 'packaging_qc_approved'))).length > 0 ? (
                      getDetailedStats(allPallets.filter(p => p.packaging_certificate_data && (p.status === 'in_warehouse' || p.status === 'awaiting_quality_officer' || p.status === 'packaging_qc_approved'))).map((stat, idx) => (
                        <tr key={idx} className="hover:bg-green-50/30 transition-colors group">
                          <td className="p-3 text-gray-700 font-medium flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 group-hover:scale-125 transition-transform"></span>
                            {stat.name}
                          </td>
                          <td className="p-3 text-center"><span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-bold text-sm">{stat.today}</span></td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.week}</td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.month}</td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.threeMonths}</td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.sixMonths}</td>
                          <td className="p-3 text-center text-gray-600 font-medium">{stat.year}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400 italic">لا توجد بيانات إحصائية حالياً</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative max-w-md w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="بحث برقم الطبلية أو الصنف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-right"
              />
            </div>
          </div>

          {/* Tomato Department Pallets Inventory */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold flex items-center gap-2 text-blue-800">
                <Box className="w-6 h-6" />
                جرد الطبالي القادمة من قسم البندورة
              </h2>
              <div className="text-xs font-bold bg-blue-100 text-blue-600 px-3 py-1 rounded-full">
                {allPallets.filter(p => p.type === 'tomato').length} طبلية إجمالاً
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b">كود الطبلية</th>
                    <th className="px-6 py-4 font-bold border-b">الصنف</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الكمية (كرتون)</th>
                    <th className="px-6 py-4 font-bold border-b text-center">تاريخ الإنتاج</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الحالة</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allPallets.filter(p => {
                    const cert = safeParse(p.certificate_data);
                    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        (cert.item_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                    return p.type === 'tomato' && matchesSearch;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 opacity-20" />
                          <span>لا يوجد طبالي مطابقة للبحث</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    allPallets.filter(p => {
                      const cert = safeParse(p.certificate_data);
                      const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                          (cert.item_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                      return p.type === 'tomato' && matchesSearch;
                    }).map((pallet) => {
                      const certData = safeParse(pallet.certificate_data);
                      
                      return (
                        <tr key={pallet.id} className="hover:bg-blue-50/30 transition-all group">
                          <td className="px-6 py-4 font-mono text-blue-600 font-bold tracking-tighter">{pallet.id}</td>
                          <td className="px-6 py-4 text-gray-900 font-bold">{certData.item_name || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold text-sm">
                              {certData.carton_count || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500 text-sm font-medium">
                            {certData.production_date || '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm inline-block min-w-[120px] ${
                              pallet.status === 'produced' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              pallet.status === 'in_packaging_stock' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                              pallet.status === 'packaging_in_progress' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                              pallet.status === 'packaging_done' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                              pallet.status === 'packaging_qc_approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                              pallet.status === 'in_warehouse' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-gray-100 text-gray-700 border border-gray-100'
                            }`}>
                              {pallet.status === 'produced' ? 'تم الإنتاج' :
                               pallet.status === 'in_packaging_stock' ? 'في مخزون التغليف' :
                               pallet.status === 'packaging_in_progress' ? 'قيد التغليف' :
                               pallet.status === 'packaging_done' ? 'تم التغليف' :
                               pallet.status === 'packaging_qc_approved' ? 'جاهز للمستودع' :
                               pallet.status === 'in_warehouse' ? 'في المستودع' : pallet.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPallet(pallet);
                                  setShowDetailsModal(true);
                                }}
                                className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                                title="عرض التفاصيل"
                              >
                                <FileText className="w-5 h-5" />
                              </button>
                              
                              {canEdit && (
                                <button
                                  onClick={() => handleEditClick(pallet)}
                                  className="p-2 text-gray-600 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
                                  title="تعديل"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteClick(pallet.id)}
                                  className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Pallets Sent to Warehouse Inventory */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-white">
              <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-800">
                <Truck className="w-6 h-6" />
                جرد الطبالي المرسلة إلى المستودع
              </h2>
              <div className="text-xs font-bold bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full">
                {allPallets.filter(p => p.packaging_certificate_data && (p.status === 'in_warehouse' || p.status === 'awaiting_quality_officer' || p.status === 'packaging_qc_approved')).length} طبلية إجمالاً
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b">كود الطبلية</th>
                    <th className="px-6 py-4 font-bold border-b">الصنف</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الكمية (كرتون)</th>
                    <th className="px-6 py-4 font-bold border-b text-center">تاريخ التغليف</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الحالة</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allPallets.filter(p => {
                    const packCert = safeParse(p.packaging_certificate_data);
                    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        (packCert.item_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                    const isSentToWarehouse = p.packaging_certificate_data && (p.status === 'in_warehouse' || p.status === 'awaiting_quality_officer' || p.status === 'packaging_qc_approved');
                    return isSentToWarehouse && matchesSearch;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="w-8 h-8 opacity-20" />
                          <span>لا يوجد طبالي مطابقة للبحث</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    allPallets.filter(p => {
                      const packCert = safeParse(p.packaging_certificate_data);
                      const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                          (packCert.item_name || '').toLowerCase().includes(searchTerm.toLowerCase());
                      const isSentToWarehouse = p.packaging_certificate_data && (p.status === 'in_warehouse' || p.status === 'awaiting_quality_officer' || p.status === 'packaging_qc_approved');
                      return isSentToWarehouse && matchesSearch;
                    }).map((pallet) => {
                      const packCertData = safeParse(pallet.packaging_certificate_data);
                      
                      return (
                        <tr key={pallet.id} className="hover:bg-emerald-50/30 transition-all group">
                          <td className="px-6 py-4 font-mono text-emerald-600 font-bold tracking-tighter">{pallet.id}</td>
                          <td className="px-6 py-4 text-gray-900 font-bold">{packCertData.item_name || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold text-sm">
                              {packCertData.carton_count || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500 text-sm font-medium">
                            {packCertData.date || '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm inline-block min-w-[120px] ${
                              pallet.status === 'in_warehouse' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              pallet.status === 'awaiting_quality_officer' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-green-50 text-green-700 border border-green-100'
                            }`}>
                              {pallet.status === 'in_warehouse' ? 'في المستودع' :
                               pallet.status === 'awaiting_quality_officer' ? 'بانتظار ضابط الجودة' :
                               pallet.status === 'packaging_qc_approved' ? 'جاهز للمستودع' : pallet.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedPallet(pallet);
                                  setShowDetailsModal(true);
                                }}
                                className="p-2 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors"
                                title="عرض التفاصيل"
                              >
                                <FileText className="w-5 h-5" />
                              </button>

                              {canEdit && (
                                <button
                                  onClick={() => handleEditClick(pallet)}
                                  className="p-2 text-gray-600 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors"
                                  title="تعديل"
                                >
                                  <Edit2 className="w-5 h-5" />
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteClick(pallet.id)}
                                  className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertModal && selectedPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
          >
            <div className="bg-white p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <ClipboardCheck className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">شهادة طبلية</h3>
                  <p className="text-xs text-gray-500">شركة لافانت للمنتجات الغذائية - نموذج إدارة الجودة وسلامة الغذاء</p>
                </div>
              </div>
              <button onClick={() => setShowCertModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto bg-white">
              {/* Top Section */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <CustomDatePicker
                    label="التاريخ"
                    value={certFormData.date}
                    onChange={(date) => setCertFormData({...certFormData, date})}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1 text-right">من قسم</label>
                  <input 
                    type="text" 
                    value="قسم التغليف" 
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-right cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1 text-right">إلى مستودع</label>
                  <input 
                    type="text" 
                    value={certFormData.warehouse_target} 
                    onChange={e => setCertFormData({...certFormData, warehouse_target: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1 text-right">رقم شهادة المطابقة</label>
                  <input 
                    type="text" 
                    value={certFormData.certificate_number} 
                    onChange={e => setCertFormData({...certFormData, certificate_number: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Gray Box Section */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 text-right">عدد الكراتين</label>
                    <input 
                      type="number" 
                      value={certFormData.carton_count} 
                      onChange={e => setCertFormData({...certFormData, carton_count: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 text-right">وزن التعبئة</label>
                    <input 
                      type="text" 
                      value={certFormData.filling_weight} 
                      onChange={e => setCertFormData({...certFormData, filling_weight: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 text-right">الصنف</label>
                    <input 
                      type="text" 
                      value={certFormData.item_name} 
                      onChange={e => setCertFormData({...certFormData, item_name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                      placeholder="مثال: بندورة حب"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <CustomDatePicker
                      label="تاريخ الانتهاء"
                      value={certFormData.expiry_date}
                      onChange={(date) => setCertFormData({...certFormData, expiry_date: date})}
                    />
                  </div>
                  <div>
                    <CustomDatePicker
                      label="تاريخ الإنتاج"
                      value={certFormData.production_date}
                      onChange={(date) => setCertFormData({...certFormData, production_date: date})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 text-right">رقم الخلطة</label>
                    <input 
                      type="text" 
                      value={certFormData.batch_number} 
                      onChange={e => setCertFormData({...certFormData, batch_number: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                    />
                  </div>
                </div>


              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-600 mb-1 text-right">الملاحظات</label>
                <textarea 
                  value={certFormData.notes} 
                  onChange={e => setCertFormData({...certFormData, notes: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>

              {/* Signatures Placeholder */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                  <span className="text-xs text-gray-500 block mb-2">توقيع المستودع</span>
                  <span className="text-xs text-gray-400">بانتظار الاستلام</span>
                </div>
                <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                  <span className="text-xs text-gray-500 block mb-2">توقيع ضابط الجودة</span>
                  <span className="text-xs text-gray-400">بانتظار الموافقة</span>
                </div>
                <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                  <span className="text-xs text-gray-500 block mb-2">توقيع مراقب الجودة</span>
                  <span className="text-xs text-gray-400">بانتظار الموافقة</span>
                </div>
                <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                  <span className="text-xs text-gray-500 block mb-2">توقيع مشرف التغليف</span>
                  <input 
                    type="text" 
                    value={certFormData.supervisor_name} 
                    onChange={e => setCertFormData({...certFormData, supervisor_name: e.target.value})}
                    className="w-full text-center text-xs border-b border-gray-300 focus:border-red-500 outline-none bg-transparent"
                    placeholder="اكتب الاسم..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-white">
              <button 
                onClick={handleFinishPackaging}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex justify-center items-center gap-2"
              >
                <Barcode className="w-5 h-5" />
                حفظ الشهادة وإنتاج الكود
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Send to Warehouse Modal */}
      {showSendModal && palletToAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الإرسال للمستودع</h3>
              <p className="text-gray-600 mb-6">
                هل أنت متأكد من إرسال الطبلية <span className="font-mono font-bold text-gray-900">{palletToAction.id}</span> إلى المستودع؟
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  onClick={confirmSendToWarehouse}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold transition-colors"
                >
                  تأكيد الإرسال
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">تعديل بيانات الطبلية: {selectedPallet.id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع الطبلية</label>
                  <select 
                    value={editFormData.type} 
                    onChange={e => setEditFormData({...editFormData, type: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="tomato">بندورة</option>
                    <option value="ketchup">كاتشب</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التفاصيل</label>
                  <input 
                    type="text" 
                    value={editFormData.details} 
                    onChange={e => setEditFormData({...editFormData, details: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {editFormData.certificate_data && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-bold text-blue-600">بيانات شهادة الإنتاج</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف</label>
                      <input 
                        type="text" 
                        value={editFormData.certificate_data.item_name || ''} 
                        onChange={e => setEditFormData({
                          ...editFormData, 
                          certificate_data: {...editFormData.certificate_data, item_name: e.target.value}
                        })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين</label>
                      <input 
                        type="number" 
                        value={editFormData.certificate_data.carton_count || ''} 
                        onChange={e => setEditFormData({
                          ...editFormData, 
                          certificate_data: {...editFormData.certificate_data, carton_count: e.target.value}
                        })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editFormData.packaging_certificate_data && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-bold text-purple-600">بيانات شهادة التغليف</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف (تغليف)</label>
                      <input 
                        type="text" 
                        value={editFormData.packaging_certificate_data.item_name || ''} 
                        onChange={e => setEditFormData({
                          ...editFormData, 
                          packaging_certificate_data: {...editFormData.packaging_certificate_data, item_name: e.target.value}
                        })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين (تغليف)</label>
                      <input 
                        type="number" 
                        value={editFormData.packaging_certificate_data.carton_count || ''} 
                        onChange={e => setEditFormData({
                          ...editFormData, 
                          packaging_certificate_data: {...editFormData.packaging_certificate_data, carton_count: e.target.value}
                        })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setShowEditModal(false)} 
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
              >
                إلغاء
              </button>
              <button 
                onClick={handleUpdatePallet} 
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200"
              >
                حفظ التعديلات
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف الطبلية"
        message={`هل أنت متأكد من حذف الطبلية رقم ${deleteModal.id}؟ سيتم حذف كافة البيانات المرتبطة بها نهائياً.`}
        confirmText="نعم، احذف"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />

      {/* Details Modal */}
      {showDetailsModal && selectedPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-gray-100"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">تفاصيل الطبلية</h3>
                  <p className="text-sm text-gray-500 font-mono">{selectedPallet.id}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {(() => {
                let certData: any = selectedPallet.certificate_data;
                if (typeof certData === 'string') {
                  try { certData = JSON.parse(certData); } catch (e) { certData = null; }
                }

                let pkgCertData: any = selectedPallet.packaging_certificate_data;
                if (typeof pkgCertData === 'string') {
                  try { pkgCertData = JSON.parse(pkgCertData); } catch (e) { pkgCertData = null; }
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Production Certificate */}
                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                      <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2 border-b border-blue-200 pb-3">
                        <Box className="w-5 h-5" />
                        شهادة الإنتاج
                      </h4>
                      {certData ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">التاريخ</span>
                              <span className="font-bold text-gray-900">{certData.date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">القسم</span>
                              <span className="font-bold text-gray-900">{certData.department || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">اسم الصنف</span>
                              <span className="font-bold text-gray-900">{certData.item_name || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">وزن التعبئة</span>
                              <span className="font-bold text-gray-900">{certData.filling_weight || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">عدد الكراتين</span>
                              <span className="font-bold text-gray-900">{certData.carton_count || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم الخلطة</span>
                              <span className="font-bold text-gray-900">{certData.batch_number || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ الإنتاج</span>
                              <span className="font-bold text-gray-900">{certData.production_date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-blue-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ الانتهاء</span>
                              <span className="font-bold text-gray-900">{certData.expiry_date || '-'}</span>
                            </div>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-blue-200">
                            <h5 className="font-bold text-sm text-blue-900 mb-3">التوقيعات</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {['supervisor', 'qc', 'quality_officer', 'warehouse'].map((role) => {
                                const val = certData.signatures?.[role];
                                const labels: Record<string, string> = {
                                  supervisor: 'المشرف',
                                  qc: 'مراقب الجودة',
                                  quality_officer: 'ضابط الجودة',
                                  warehouse: 'المستودع'
                                };
                                const colorClasses: Record<string, any> = {
                                  supervisor: { bg: 'bg-red-50/50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600' },
                                  qc: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
                                  quality_officer: { bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600' },
                                  warehouse: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-900', icon: 'text-emerald-600' },
                                };
                                const colors = colorClasses[role];

                                return (
                                  <div key={role} className={`p-3 rounded-xl border transition-all ${
                                    val?.signed 
                                      ? `${colors.bg} ${colors.border}` 
                                      : "bg-white border-blue-100 border-dashed"
                                  }`}>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{labels[role]}</div>
                                    {val?.signed ? (
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
                                        <div className="flex flex-col">
                                          <span className={`text-sm font-serif italic ${colors.text}`}>{val.name}</span>
                                          <span className="text-[9px] text-gray-500">{new Date(val.date).toLocaleDateString('ar-EG')}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">بانتظار التوقيع...</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8 italic">لا توجد بيانات لشهادة الإنتاج</p>
                      )}
                    </div>

                    {/* Packaging Certificate */}
                    <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                      <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2 border-b border-purple-200 pb-3">
                        <Package className="w-5 h-5" />
                        شهادة التغليف
                      </h4>
                      {pkgCertData ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">التاريخ</span>
                              <span className="font-bold text-gray-900">{pkgCertData.date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">القسم</span>
                              <span className="font-bold text-gray-900">{pkgCertData.department || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">اسم الصنف</span>
                              <span className="font-bold text-gray-900">{pkgCertData.item_name || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">وزن التعبئة</span>
                              <span className="font-bold text-gray-900">{pkgCertData.filling_weight || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">عدد الكراتين</span>
                              <span className="font-bold text-gray-900">{pkgCertData.carton_count || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم الخلطة</span>
                              <span className="font-bold text-gray-900">{pkgCertData.batch_number || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ الإنتاج</span>
                              <span className="font-bold text-gray-900">{pkgCertData.production_date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">تاريخ الانتهاء</span>
                              <span className="font-bold text-gray-900">{pkgCertData.expiry_date || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">رقم شهادة المطابقة</span>
                              <span className="font-bold text-gray-900">{pkgCertData.certificate_number || '-'}</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-purple-50">
                              <span className="text-gray-500 block text-xs mb-1">المستودع المستهدف</span>
                              <span className="font-bold text-gray-900">{pkgCertData.warehouse_target || '-'}</span>
                            </div>
                            {pkgCertData.notes && (
                              <div className="col-span-2 bg-white p-3 rounded-xl border border-purple-50">
                                <span className="text-gray-500 block text-xs mb-1">ملاحظات</span>
                                <span className="font-bold text-gray-900">{pkgCertData.notes}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-purple-200">
                            <h5 className="font-bold text-sm text-purple-900 mb-3">التوقيعات</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {['supervisor', 'qc', 'quality_officer', 'warehouse'].map((role) => {
                                const val = pkgCertData.signatures?.[role];
                                const labels: Record<string, string> = {
                                  supervisor: 'مشرفة التغليف',
                                  qc: 'مراقب الجودة',
                                  quality_officer: 'ضابط الجودة',
                                  warehouse: 'المستودع'
                                };
                                const colorClasses: Record<string, any> = {
                                  supervisor: { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' },
                                  qc: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
                                  quality_officer: { bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600' },
                                  warehouse: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-900', icon: 'text-emerald-600' },
                                };
                                const colors = colorClasses[role];

                                return (
                                  <div key={role} className={`p-3 rounded-xl border transition-all ${
                                    val?.signed 
                                      ? `${colors.bg} ${colors.border}` 
                                      : "bg-white border-purple-100 border-dashed"
                                  }`}>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{labels[role]}</div>
                                    {val?.signed ? (
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
                                        <div className="flex flex-col">
                                          <span className={`text-sm font-serif italic ${colors.text}`}>{val.name}</span>
                                          <span className="text-[9px] text-gray-500">{new Date(val.date).toLocaleDateString('ar-EG')}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">بانتظار التوقيع...</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8 italic">لا توجد بيانات لشهادة التغليف</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PackagingDepartment;
