import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, CheckCircle, AlertCircle, ArrowRight, Truck, Barcode, 
  ClipboardCheck, Play, Box, List, History, Search, FileText, 
  BarChart3, Edit2, Trash2, X, Calendar, Building2, Tag, Weight, 
  Hash, Layers, CalendarCheck, CalendarX, ShieldCheck, User, 
  Globe, ClipboardList, FileX, Clock 
} from "lucide-react";
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
  const [orders, setOrders] = useState<any[]>([]);
  const [orderWarning, setOrderWarning] = useState("");

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
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await fetchWithAuth("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  };

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
      order_number: prodCert.order_number || '',
      supervisor_name: '',
      notes: ''
    });

    if (prodCert.order_number && prodCert.order_number.trim() !== '') {
      const order = orders.find(o => o.order_number === prodCert.order_number.trim());
      if (!order) {
        setOrderWarning("تحذير: رقم الطلبية غير موجود في النظام");
      } else if (order.status === 'completed') {
        setOrderWarning("تحذير: هذه الطلبية مكتملة بالفعل");
      } else {
        setOrderWarning("");
      }
    } else {
      setOrderWarning("");
    }

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
    const prodCert = safeParse(pallet.certificate_data);
    const packCert = safeParse(pallet.packaging_certificate_data);
    
    setEditFormData({
      details: pallet.details,
      type: pallet.type,
      certificate_data: prodCert,
      packaging_certificate_data: packCert
    });

    const orderNumber = packCert.order_number || prodCert.order_number;
    if (orderNumber && orderNumber.trim() !== '') {
      const order = orders.find(o => o.order_number === orderNumber.trim());
      if (!order) {
        setOrderWarning("تحذير: رقم الطلبية غير موجود في النظام");
      } else if (order.status === 'completed') {
        setOrderWarning("تحذير: هذه الطلبية مكتملة بالفعل");
      } else {
        setOrderWarning("");
      }
    } else {
      setOrderWarning("");
    }

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
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReceivePallet(pallet.id)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    استلام للمخزون
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPallet(pallet);
                      setShowDetailsModal(true);
                    }}
                    className="px-3 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
                    title="عرض التفاصيل"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
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
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartPackaging(pallet.id)}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-md hover:bg-orange-700 transition-colors flex justify-center items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    بدء التغليف
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPallet(pallet);
                      setShowDetailsModal(true);
                    }}
                    className="px-3 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center"
                    title="عرض التفاصيل"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
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
                            جاري عملية التغليف
                          </span>
                        )}
                        {pallet.status === 'packaging_done' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            مكتمل التغليف - بانتظار موافقة الجودة
                          </span>
                        )}
                        {pallet.status === 'packaging_qc_approved' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            جاهز للنقل للمستودع
                          </span>
                        )}
                        {pallet.status === 'awaiting_quality_officer' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            بانتظار توقيع ضابط الجودة
                          </span>
                        )}
                        {pallet.status === 'awaiting_warehouse' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            بانتظار توقيع المستودع
                          </span>
                        )}
                        {pallet.status === 'in_warehouse' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            تم التخزين في المستودع النهائي
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedPallet(pallet);
                            setShowDetailsModal(true);
                          }}
                          className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                          title="عرض التفاصيل"
                        >
                          <FileText className="w-3 h-3" />
                          تفاصيل
                        </button>
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
                              pallet.status === 'awaiting_quality_officer' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                              pallet.status === 'awaiting_warehouse' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              pallet.status === 'in_warehouse' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-gray-100 text-gray-700 border border-gray-100'
                            }`}>
                              {pallet.status === 'produced' ? 'تم الإنتاج - بانتظار فحص الجودة' :
                               pallet.status === 'in_packaging_stock' ? 'مستلم في قسم التغليف' :
                               pallet.status === 'packaging_in_progress' ? 'جاري عملية التغليف' :
                               pallet.status === 'packaging_done' ? 'مكتمل التغليف - بانتظار موافقة الجودة' :
                               pallet.status === 'packaging_qc_approved' ? 'جاهز للنقل للمستودع' :
                               pallet.status === 'awaiting_quality_officer' ? 'بانتظار توقيع ضابط الجودة' :
                               pallet.status === 'awaiting_warehouse' ? 'بانتظار توقيع المستودع' :
                               pallet.status === 'in_warehouse' ? 'تم التخزين في المستودع النهائي' : pallet.status}
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
                <div>
                  <label className="block text-sm text-gray-600 mb-1 text-right">الزبون</label>
                  <input 
                    type="text" 
                    value={certFormData.customer || ''} 
                    onChange={e => setCertFormData({...certFormData, customer: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1 text-right">البلد</label>
                  <input 
                    type="text" 
                    value={certFormData.country || ''} 
                    onChange={e => setCertFormData({...certFormData, country: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1 text-right">رقم الطلبية</label>
                  <input 
                    type="text" 
                    value={certFormData.order_number || ''} 
                    onChange={e => {
                      const value = e.target.value;
                      setCertFormData({...certFormData, order_number: value});
                      if (value.trim() !== '') {
                        const order = orders.find(o => o.order_number === value.trim());
                        if (!order) {
                          setOrderWarning("تحذير: رقم الطلبية غير موجود في النظام");
                        } else if (order.status === 'completed') {
                          setOrderWarning("تحذير: هذه الطلبية مكتملة بالفعل");
                        } else {
                          setOrderWarning("");
                        }
                      } else {
                        setOrderWarning("");
                      }
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 ${orderWarning ? 'border-orange-500 bg-orange-50' : 'border-gray-300'}`}
                  />
                  {orderWarning && (
                    <p className="text-orange-600 text-xs mt-1 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {orderWarning}
                    </p>
                  )}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الزبون</label>
                      <input 
                        type="text" 
                        value={editFormData.certificate_data.customer || ''} 
                        onChange={e => setEditFormData({
                          ...editFormData, 
                          certificate_data: {...editFormData.certificate_data, customer: e.target.value}
                        })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البلد</label>
                      <input 
                        type="text" 
                        value={editFormData.certificate_data.country || ''} 
                        onChange={e => setEditFormData({
                          ...editFormData, 
                          certificate_data: {...editFormData.certificate_data, country: e.target.value}
                        })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطلبية</label>
                      <input 
                        type="text" 
                        value={editFormData.certificate_data.order_number || ''} 
                        onChange={e => {
                          const value = e.target.value;
                          setEditFormData({
                            ...editFormData, 
                            certificate_data: {...editFormData.certificate_data, order_number: value}
                          });
                          if (value.trim() !== '') {
                            const order = orders.find(o => o.order_number === value.trim());
                            if (!order) {
                              setOrderWarning("تحذير: رقم الطلبية غير موجود في النظام");
                            } else if (order.status === 'completed') {
                              setOrderWarning("تحذير: هذه الطلبية مكتملة بالفعل");
                            } else {
                              setOrderWarning("");
                            }
                          } else {
                            setOrderWarning("");
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${orderWarning ? 'border-orange-500 bg-orange-50' : ''}`}
                      />
                      {orderWarning && (
                        <p className="text-orange-600 text-xs mt-1 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {orderWarning}
                        </p>
                      )}
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الزبون (تغليف)</label>
                      <input 
                        type="text" 
                        value={editFormData.packaging_certificate_data.customer || ''} 
                        onChange={e => setEditFormData({
                          ...editFormData, 
                          packaging_certificate_data: {...editFormData.packaging_certificate_data, customer: e.target.value}
                        })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">البلد (تغليف)</label>
                      <input 
                        type="text" 
                        value={editFormData.packaging_certificate_data.country || ''} 
                        onChange={e => setEditFormData({
                          ...editFormData, 
                          packaging_certificate_data: {...editFormData.packaging_certificate_data, country: e.target.value}
                        })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الطلبية (تغليف)</label>
                      <input 
                        type="text" 
                        value={editFormData.packaging_certificate_data.order_number || ''} 
                        onChange={e => {
                          const value = e.target.value;
                          setEditFormData({
                            ...editFormData, 
                            packaging_certificate_data: {...editFormData.packaging_certificate_data, order_number: value}
                          });
                          if (value.trim() !== '') {
                            const order = orders.find(o => o.order_number === value.trim());
                            if (!order) {
                              setOrderWarning("تحذير: رقم الطلبية غير موجود في النظام");
                            } else if (order.status === 'completed') {
                              setOrderWarning("تحذير: هذه الطلبية مكتملة بالفعل");
                            } else {
                              setOrderWarning("");
                            }
                          } else {
                            setOrderWarning("");
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${orderWarning ? 'border-orange-500 bg-orange-50' : ''}`}
                      />
                      {orderWarning && (
                        <p className="text-orange-600 text-xs mt-1 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {orderWarning}
                        </p>
                      )}
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
      <AnimatePresence>
        {showDetailsModal && selectedPallet && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden border border-gray-100"
            >
              <div className="bg-gray-50 p-6 border-b flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">تفاصيل الطبلية: {selectedPallet.id}</h3>
                  <p className="text-sm text-gray-500 mt-1">تاريخ الإنشاء: {new Date(selectedPallet.created_at).toLocaleString('ar-EG')}</p>
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-10" dir="rtl">
                {(() => {
                  let certData: any = selectedPallet.certificate_data;
                  if (typeof certData === 'string') {
                    try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
                  }
                  
                  let pkgCertData: any = selectedPallet.packaging_certificate_data;
                  if (typeof pkgCertData === 'string') {
                    try { pkgCertData = JSON.parse(pkgCertData); } catch (e) { pkgCertData = null; }
                  }

                  const renderCert = (cert: any, title: string, type: 'production' | 'packaging') => {
                    if (!cert || Object.keys(cert).length === 0) return (
                      <div className="flex-1 min-w-[300px] rounded-2xl border border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                        <FileX className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-medium">لا توجد بيانات {title}</p>
                      </div>
                    );

                    const isProduction = type === 'production';
                    const borderColor = isProduction ? "border-blue-100" : "border-purple-100";
                    const accentColor = isProduction ? "text-blue-600" : "text-purple-600";
                    const headerBg = isProduction ? "bg-blue-50/50" : "bg-purple-50/50";
                    const iconColor = isProduction ? "text-blue-500" : "text-purple-500";

                    const fields = [
                      { label: "التاريخ", value: cert?.date || "-", icon: Calendar },
                      { label: "القسم", value: cert?.department || "-", icon: Building2 },
                      { label: "اسم الصنف", value: cert?.item_name || "-", icon: Tag },
                      { label: "وزن التعبئة", value: cert?.filling_weight || "-", icon: Weight },
                      { label: "عدد الكراتين", value: cert?.carton_count || "-", icon: Hash },
                      { label: "رقم الخلطة", value: cert?.batch_number || "-", icon: Layers },
                      { label: "تاريخ الإنتاج", value: cert?.production_date || "-", icon: CalendarCheck },
                      { label: "تاريخ الانتهاء", value: cert?.expiry_date || "-", icon: CalendarX },
                      { label: "رقم شهادة المطابقة", value: cert?.certificate_number || "-", icon: ShieldCheck },
                      { label: "الزبون", value: cert?.customer || "-", icon: User },
                      { label: "البلد", value: cert?.country || "-", icon: Globe },
                      { label: "رقم الطلبية", value: cert?.order_number || "-", icon: ClipboardList },
                      { label: "إلى مستودع", value: cert?.warehouse_target || "-", icon: Truck },
                    ];

                    return (
                      <div className={`flex-1 min-w-[300px] rounded-2xl border ${borderColor} overflow-hidden shadow-sm bg-white flex flex-col`}>
                        <div className={`${headerBg} p-4 border-b ${borderColor} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${isProduction ? 'bg-blue-100' : 'bg-purple-100'}`}>
                              <FileText className={`w-5 h-5 ${accentColor}`} />
                            </div>
                            <h4 className={`font-bold ${accentColor}`}>{title}</h4>
                          </div>
                          <span className="text-[10px] font-mono text-gray-400 bg-white/50 px-2 py-1 rounded border border-gray-100 uppercase">
                            {type}
                          </span>
                        </div>
                        
                        <div className="p-5 space-y-6 flex-1">
                          <div className="grid grid-cols-1 gap-y-3">
                            {fields.map((field, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm group">
                                <div className="flex items-center gap-2 text-gray-500">
                                  <field.icon className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                                  <span>{field.label}:</span>
                                </div>
                                <span className="font-semibold text-gray-900">{field.value}</span>
                              </div>
                            ))}
                          </div>
                          
                          {cert?.notes && (
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden">
                              <div className={`absolute top-0 right-0 w-1 h-full ${isProduction ? 'bg-blue-200' : 'bg-purple-200'}`} />
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">ملاحظات إضافية</span>
                              <p className="text-xs text-gray-600 leading-relaxed">{cert.notes}</p>
                            </div>
                          )}

                          <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                              <ShieldCheck className={`w-4 h-4 ${iconColor}`} />
                              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">الاعتمادات الرسمية</h5>
                            </div>
                            
                            <div className="grid gap-3">
                              {(isProduction ? ['supervisor', 'qc'] : ['supervisor', 'qc', 'quality_officer', 'warehouse']).map((role) => {
                                const sig = cert?.signatures?.[role];
                                const roleLabel = 
                                  role === 'supervisor' ? (isProduction ? 'مشرف الإنتاج' : 'مشرف التغليف') :
                                  role === 'qc' ? 'مراقب الجودة' :
                                  role === 'quality_officer' ? 'ضابط الجودة' :
                                  role === 'warehouse' ? 'أمين المستودع' : role;

                                return (
                                  <div 
                                    key={role} 
                                    className={`group relative p-3 rounded-xl border transition-all duration-300 ${
                                      sig?.signed 
                                        ? 'bg-green-50/30 border-green-100 shadow-sm' 
                                        : 'bg-gray-50/50 border-gray-100 border-dashed'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${sig?.signed ? 'text-green-600' : 'text-gray-400'}`}>
                                          {roleLabel}
                                        </span>
                                        {sig?.signed ? (
                                          <span className="text-sm font-serif italic text-gray-900 mt-0.5">{sig.name}</span>
                                        ) : (
                                          <span className="text-xs text-gray-300 italic mt-0.5">بانتظار التوقيع...</span>
                                        )}
                                      </div>
                                      
                                      {sig?.signed ? (
                                        <div className="flex flex-col items-end">
                                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-inner">
                                            <CheckCircle className="w-5 h-5" />
                                          </div>
                                          <span className="text-[9px] text-gray-400 mt-1 font-mono">
                                            {new Date(sig.date).toLocaleDateString('ar-EG')}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="w-8 h-8 rounded-full border border-dashed border-gray-200 flex items-center justify-center text-gray-200">
                                          <Clock className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    {sig?.signed && (
                                      <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                        <ShieldCheck className="w-16 h-16 text-green-900" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-10">
                      {/* Status Timeline */}
                      <div className="relative px-4">
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ 
                              width: selectedPallet.status === 'in_warehouse' ? '100%' : 
                                     selectedPallet.status.includes('packaging') ? '50%' : '0%' 
                            }}
                            className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                          />
                        </div>
                        
                        <div className="flex justify-between relative z-10">
                          {[
                            { status: 'produced', label: 'مرحلة الإنتاج', icon: Package },
                            { status: 'packaging', label: 'مرحلة التغليف', icon: Package },
                            { status: 'warehouse', label: 'المستودع النهائي', icon: Truck }
                          ].map((step, idx) => {
                            const isCompleted = 
                              (selectedPallet.status === 'produced' && idx === 0) ||
                              (selectedPallet.status.includes('packaging') && idx <= 1) ||
                              (selectedPallet.status === 'in_warehouse' && idx <= 2);
                            
                            const isCurrent = 
                              (selectedPallet.status === 'produced' && idx === 0) ||
                              (selectedPallet.status.includes('packaging') && idx === 1) ||
                              (selectedPallet.status === 'in_warehouse' && idx === 2);

                            return (
                              <div key={step.status} className="flex flex-col items-center group">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                                  isCompleted 
                                    ? isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-110' : 'bg-white border-blue-500 text-blue-500'
                                    : 'bg-white border-gray-200 text-gray-300'
                                }`}>
                                  <step.icon className="w-6 h-6" />
                                  {isCompleted && !isCurrent && (
                                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 border-2 border-white">
                                      <CheckCircle className="w-3 h-3" />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 text-center">
                                  <span className={`text-xs font-black uppercase tracking-widest block ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {step.label}
                                  </span>
                                  {isCurrent && (
                                    <motion.span 
                                      layoutId="current-indicator"
                                      className="inline-block w-1 h-1 rounded-full bg-blue-600 mt-1"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-8">
                        {renderCert(certData, "شهادة الإنتاج", "production")}
                        {renderCert(pkgCertData, "شهادة التغليف", "packaging")}
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
      </AnimatePresence>
    </div>
  );
};

export default PackagingDepartment;
