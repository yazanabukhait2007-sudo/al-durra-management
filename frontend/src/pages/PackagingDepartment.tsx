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
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"operations" | "inventory">("operations");
  
  // Data states
  const [incomingPallets, setIncomingPallets] = useState<Pallet[]>([]);
  const [stockPallets, setStockPallets] = useState<Pallet[]>([]);
  const [processingPallets, setProcessingPallets] = useState<Pallet[]>([]);
  const [allPallets, setAllPallets] = useState<Pallet[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Modal states
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [certData, setCertData] = useState({
    packagingDate: new Date().toISOString().split("T")[0],
    packagedBy: "",
    packagingMaterial: "",
    qualityCheckPassed: true,
    notes: ""
  });
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [palletToDelete, setPalletToDelete] = useState<string | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [palletToSend, setPalletToSend] = useState<string | null>(null);

  // Helper function to safely parse JSON
  const safeParse = (jsonString: string | undefined | null) => {
    if (!jsonString) return {};
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse JSON:", jsonString);
      return {};
    }
  };

  // Calculate stats
  const getDetailedStats = () => {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      incoming: incomingPallets.length,
      inStock: stockPallets.length,
      processing: processingPallets.length,
      packagedToday: allPallets.filter(p => 
        p.status === 'packaged' && 
        p.created_at.startsWith(today)
      ).length,
      totalPackaged: allPallets.filter(p => p.status === 'packaged').length
    };
  };

  // Load orders
  const loadOrders = async () => {
    try {
      const data = await fetchWithAuth("/api/orders");
      if (Array.isArray(data)) setOrders(data);
    } catch (err) {
      console.error("Error loading orders:", err);
      showToast("فشل تحميل الطلبيات", "error");
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadIncomingPallets(),
        loadStockPallets(),
        loadProcessingPallets(),
        loadAllPallets(),
        loadOrders()
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("فشل تحميل البيانات. يرجى المحاولة مرة أخرى.");
      showToast("فشل تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // API Calls
  const loadIncomingPallets = async () => {
    const data = await fetchWithAuth("/api/pallets?status=sent_to_packaging");
    if (Array.isArray(data)) setIncomingPallets(data);
  };

  const loadStockPallets = async () => {
    const data = await fetchWithAuth("/api/pallets?status=in_packaging_stock");
    if (Array.isArray(data)) setStockPallets(data);
  };

  const loadProcessingPallets = async () => {
    const data = await fetchWithAuth("/api/pallets?status=packaging_processing");
    if (Array.isArray(data)) setProcessingPallets(data);
  };

  const loadAllPallets = async () => {
    const data = await fetchWithAuth("/api/pallets");
    if (Array.isArray(data)) setAllPallets(data);
  };

  // Action Handlers
  const handleReceivePallet = async (id: string) => {
    try {
      await fetchWithAuth(`/api/pallets/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_packaging_stock" }),
      });
      showToast("تم استلام الطبلية في المخزن", "success");
      loadAllData();
    } catch (err) {
      console.error("Error receiving pallet:", err);
      showToast("فشل استلام الطبلية", "error");
    }
  };

  const handleStartPackaging = async (id: string) => {
    try {
      await fetchWithAuth(`/api/pallets/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "packaging_processing" }),
      });
      showToast("بدأت عملية التغليف", "success");
      loadAllData();
    } catch (err) {
      console.error("Error starting packaging:", err);
      showToast("فشل بدء عملية التغليف", "error");
    }
  };

  const openCertModal = (pallet: Pallet) => {
    setSelectedPallet(pallet);
    setIsCertModalOpen(true);
  };

  const handleFinishPackaging = async () => {
    if (!selectedPallet) return;

    try {
      await fetchWithAuth(`/api/pallets/${selectedPallet.id}/packaging-cert`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateData: certData }),
      });

      await fetchWithAuth(`/api/pallets/${selectedPallet.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "packaged" }),
      });

      showToast("اكتمل التغليف وتم التوثيق", "success");
      setIsCertModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error finishing packaging:", err);
      showToast("فشل إكمال التغليف", "error");
    }
  };

  const confirmSendToWarehouse = (id: string) => {
    setPalletToSend(id);
    setIsSendModalOpen(true);
  };

  const handleSendToWarehouse = async () => {
    if (!palletToSend) return;
    
    try {
      await fetchWithAuth(`/api/pallets/${palletToSend}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent_to_warehouse" }),
      });
      showToast("تم إرسال الطبلية للمستودع", "success");
      setIsSendModalOpen(false);
      setPalletToSend(null);
      loadAllData();
    } catch (err) {
      console.error("Error sending to warehouse:", err);
      showToast("فشل إرسال الطبلية للمستودع", "error");
    }
  };

  const handleEditClick = (pallet: Pallet) => {
    setEditData({
      ...pallet,
      details: safeParse(pallet.details)
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePallet = async () => {
    if (!editData) return;
    
    try {
      await fetchWithAuth(`/api/pallets/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editData.type,
          details: JSON.stringify(editData.details)
        }),
      });
      showToast("تم تحديث الطبلية بنجاح", "success");
      setIsEditModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error("Error updating pallet:", err);
      showToast("فشل تحديث الطبلية", "error");
    }
  };

  const handleDeleteClick = (id: string) => {
    setPalletToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!palletToDelete) return;
    
    try {
      await fetchWithAuth(`/api/pallets/${palletToDelete}`, {
        method: "DELETE",
      });
      showToast("تم حذف الطبلية بنجاح", "success");
      setIsDeleteModalOpen(false);
      setPalletToDelete(null);
      loadAllData();
    } catch (err) {
      console.error("Error deleting pallet:", err);
      showToast("فشل حذف الطبلية", "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            قسم التغليف
          </h1>
          <p className="text-slate-500 mt-1">إدارة عمليات التغليف والمخزون</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("operations")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${ activeTab === "operations" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900" }`}
          >
            العمليات
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${ activeTab === "inventory" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900" }`}
          >
            المخزون والسجل
          </button>
        </div>
      </div>
      {/* Operations Tab */}
      {activeTab === "operations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incoming from Production */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-amber-900 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-amber-600" />
                الوارد
              </h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {incomingPallets.length}
              </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              {incomingPallets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Package className="w-12 h-12 mb-2 opacity-20" />
                  <p>لا توجد طبالي واردة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {incomingPallets.map((pallet) => {
                      const details = safeParse(pallet.details);
                      return (
                        <motion.div
                          key={pallet.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              #{pallet.id.substring(0, 8)}
                            </div>
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                              {pallet.type}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-4">
                            <div className="text-sm font-medium text-slate-800">
                              {details.productName || 'منتج غير معروف'}
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between">
                              <span>الكمية: {details.quantity || 0} {details.unit || 'وحدة'}</span>
                              <span>التشغيلة: {details.batchNumber || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleReceivePallet(pallet.id)}
                            className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            استلام للمخزن
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Packaging Stock */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-blue-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-600" />
                في المخزن
              </h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {stockPallets.length}
              </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              {stockPallets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Layers className="w-12 h-12 mb-2 opacity-20" />
                  <p>المخزن فارغ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {stockPallets.map((pallet) => {
                      const details = safeParse(pallet.details);
                      return (
                        <motion.div
                          key={pallet.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              #{pallet.id.substring(0, 8)}
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                              {pallet.type}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-4">
                            <div className="text-sm font-medium text-slate-800">
                              {details.productName || 'منتج غير معروف'}
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between">
                              <span>الكمية: {details.quantity || 0} {details.unit || 'وحدة'}</span>
                              <span>التشغيلة: {details.batchNumber || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleStartPackaging(pallet.id)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Play className="w-4 h-4" />
                            بدء التغليف
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Processing */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-indigo-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                قيد التغليف
              </h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {processingPallets.length}
              </span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              {processingPallets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <ClipboardList className="w-12 h-12 mb-2 opacity-20" />
                  <p>لا توجد عمليات تغليف نشطة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {processingPallets.map((pallet) => {
                      const details = safeParse(pallet.details);
                      return (
                        <motion.div
                          key={pallet.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                          
                          <div className="flex justify-between items-start mb-2 pl-2">
                            <div className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              #{pallet.id.substring(0, 8)}
                            </div>
                            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-pulse" />
                              قيد التنفيذ
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-4 pl-2">
                            <div className="text-sm font-medium text-slate-800">
                              {details.productName || 'منتج غير معروف'}
                            </div>
                            <div className="text-xs text-slate-500 flex justify-between">
                              <span>الكمية: {details.quantity || 0} {details.unit || 'وحدة'}</span>
                              <span>التشغيلة: {details.batchNumber || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => openCertModal(pallet)}
                            className="w-full py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            إكمال وتوثيق
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Inventory & History Tab */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">تم تغليفه اليوم</p>
                <p className="text-2xl font-bold text-slate-800">{getDetailedStats().packagedToday}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">إجمالي المغلف</p>
                <p className="text-2xl font-bold text-slate-800">{getDetailedStats().totalPackaged}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">قيد التغليف</p>
                <p className="text-2xl font-bold text-slate-800">{getDetailedStats().processing}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">جاهز للمستودع</p>
                <p className="text-2xl font-bold text-slate-800">
                  {allPallets.filter(p => p.status === 'packaged').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالرقم، المنتج، أو التشغيلة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-right"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              {['all', 'packaged', 'sent_to_warehouse'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${ filterStatus === status ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100" }`}
                >
                  {status === 'all' ? 'الكل' : status === 'packaged' ? 'تم التغليف' : 'أرسل للمستودع'}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-sm font-semibold text-slate-600">الرقم والنوع</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">تفاصيل المنتج</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">الحالة</th>
                    <th className="p-4 text-sm font-semibold text-slate-600">التاريخ</th>
                    <th className="p-4 text-sm font-semibold text-slate-600 text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPallets
                    .filter(p => filterStatus === 'all' || p.status === filterStatus)
                    .filter(p => {
                      if (!searchTerm) return true;
                      const searchLower = searchTerm.toLowerCase();
                      const details = safeParse(p.details);
                      return (
                        p.id.toLowerCase().includes(searchLower) ||
                        p.type.toLowerCase().includes(searchLower) ||
                        (details.productName || '').toLowerCase().includes(searchLower) ||
                        (details.batchNumber || '').toLowerCase().includes(searchLower)
                      );
                    })
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((pallet) => {
                      const details = safeParse(pallet.details);
                      
                      return (
                        <tr key={pallet.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-sm text-slate-900">#{pallet.id.substring(0, 8)}</span>
                              <span className="text-xs text-slate-500">{pallet.type}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">{details.productName || 'غير معروف'}</span>
                              <span className="text-xs text-slate-500">
                                التشغيلة: {details.batchNumber || 'N/A'} • الكمية: {details.quantity || 0}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ pallet.status === 'packaged' ? 'bg-emerald-100 text-emerald-700' : pallet.status === 'sent_to_warehouse' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700' }`}>
                              {pallet.status === 'packaged' && <CheckCircle className="w-3.5 h-3.5" />}
                              {pallet.status === 'sent_to_warehouse' && <Truck className="w-3.5 h-3.5" />}
                              {pallet.status === 'packaged' ? 'تم التغليف' : pallet.status === 'sent_to_warehouse' ? 'أرسل للمستودع' : pallet.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-slate-600">
                            {new Date(pallet.created_at).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="p-4 text-left">
                            <div className="flex justify-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {pallet.status === 'packaged' && (
                                <button
                                  onClick={() => confirmSendToWarehouse(pallet.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="إرسال للمستودع"
                                >
                                  <Truck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditClick(pallet)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="تعديل"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(pallet.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {allPallets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p>لم يتم العثور على طبالي في المخزن</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* MODALS */}
      {/* Certificate Modal */}
      <AnimatePresence>
        {isCertModalOpen && selectedPallet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">إكمال التغليف والتوثيق</h3>
                    <p className="text-sm text-slate-500">طبلية رقم #{selectedPallet.id.substring(0, 8)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCertModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ التغليف</label>
                    <CustomDatePicker
                      label=""
                      value={certData.packagingDate}
                      onChange={(date) => setCertData({ ...certData, packagingDate: date })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">تم التغليف بواسطة</label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={certData.packagedBy}
                        onChange={(e) => setCertData({ ...certData, packagedBy: e.target.value })}
                        className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                        placeholder="اسم المشغل"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">مواد التغليف</label>
                    <div className="relative">
                      <Box className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={certData.packagingMaterial}
                        onChange={(e) => setCertData({ ...certData, packagingMaterial: e.target.value })}
                        className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                        placeholder="مثال: كرتون، بلاستيك"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">اجتياز فحص الجودة</label>
                    <div className="flex items-center h-[42px] justify-end">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={certData.qualityCheckPassed}
                          onChange={(e) => setCertData({ ...certData, qualityCheckPassed: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        <span className="mr-3 text-sm font-medium text-slate-700">
                          {certData.qualityCheckPassed ? 'نعم' : 'لا'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ملاحظات</label>
                  <textarea
                    value={certData.notes}
                    onChange={(e) => setCertData({ ...certData, notes: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[100px] text-right"
                    placeholder="أي ملاحظات إضافية حول عملية التغليف..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-start gap-3">
                <button
                  onClick={() => setIsCertModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleFinishPackaging}
                  disabled={!certData.packagedBy || !certData.packagingMaterial}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  إكمال وتوثيق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && editData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-800">تعديل الطبلية</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">نوع الطبلية</label>
                  <input
                    type="text"
                    value={editData.type}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">التفاصيل (JSON)</label>
                  <textarea
                    value={editData.details}
                    onChange={(e) => setEditData({ ...editData, details: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[150px] font-mono text-sm text-right"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-start gap-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdatePallet}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  حفظ التغييرات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="حذف الطبلية"
        message="هل أنت متأكد من رغبتك في حذف هذه الطبلية؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isSendModalOpen}
        onCancel={() => setIsSendModalOpen(false)}
        onConfirm={handleSendToWarehouse}
        title="إرسال للمستودع"
        message="هل أنت متأكد من رغبتك في إرسال هذه الطبلية المغلفة إلى المستودع؟"
        confirmText="إرسال للمستودع"
        isDestructive={false}
      />
    </div>
  );
};

export default PackagingDepartment;
