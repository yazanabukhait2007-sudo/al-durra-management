import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Package, ArrowRight, CheckCircle, AlertCircle, Barcode, Truck, FileText, ChevronDown, ClipboardCheck, ShieldCheck, Clock, BarChart3, List } from "lucide-react";
import { fetchWithAuth } from "../utils/api";
import CustomDatePicker from "../components/CustomDatePicker";

interface Pallet {
  id: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  certificate_data?: string;
}

interface PalletCertificate {
  date: string;
  department: string;
  item_name: string;
  filling_weight: string;
  carton_count: string;
  batch_number: string;
  production_date: string;
  expiry_date: string;
  warehouse_target: string;
  certificate_number: string;
  notes: string;
  signatures?: {
    supervisor?: {
      signed: boolean;
      date: string;
      name: string;
    };
    qc?: {
      signed: boolean;
      date: string;
      name: string;
    };
    quality_officer?: {
      signed: boolean;
      date: string;
      name: string;
    };
    warehouse?: {
      signed: boolean;
      date: string;
      name: string;
    };
  };
}

const ProductionKetchup = () => {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  const [formData, setFormData] = useState<PalletCertificate>({
    date: new Date().toISOString().slice(0, 10),
    department: "قسم الكاتشب والصوصات",
    item_name: "",
    filling_weight: "",
    carton_count: "",
    batch_number: "",
    production_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    warehouse_target: "",
    certificate_number: "",
    notes: "",
  });

  useEffect(() => {
    loadPallets();
  }, []);

  const loadPallets = async () => {
    try {
      const res = await fetchWithAuth("/api/production/pallets?type=ketchup");
      if (res.ok) {
        const data = await res.json();
        setPallets(data);
      } else {
        console.error("Failed to load pallets");
      }
    } catch (err) {
      console.error("Failed to load pallets", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try {
        certData = JSON.parse(certData);
      } catch (e) {
        certData = {};
      }
    }
    
    setFormData({
      date: certData.date || new Date().toISOString().slice(0, 10),
      department: certData.department || "قسم الكاتشب والصوصات",
      item_name: certData.item_name || "",
      filling_weight: certData.filling_weight || "",
      carton_count: certData.carton_count || "",
      batch_number: certData.batch_number || "",
      production_date: certData.production_date || new Date().toISOString().slice(0, 10),
      expiry_date: certData.expiry_date || "",
      warehouse_target: certData.warehouse_target || "",
      certificate_number: certData.certificate_number || "",
      notes: certData.notes || "",
    });
    setEditingId(pallet.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      department: "قسم الكاتشب والصوصات",
      item_name: "",
      filling_weight: "",
      carton_count: "",
      batch_number: "",
      production_date: new Date().toISOString().slice(0, 10),
      expiry_date: "",
      warehouse_target: "",
      certificate_number: "",
      notes: "",
    });
  };

  const [showInventory, setShowInventory] = useState(false);

  const getDetailedStats = () => {
    const now = new Date();
    const productStats: Record<string, { today: number, week: number, month: number, threeMonths: number, sixMonths: number, year: number }> = {};

    pallets.forEach(pallet => {
      let certData: any = {};
      try {
        certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
      } catch (e) {}
      
      const itemName = certData.item_name || "غير محدد";
      if (!productStats[itemName]) {
        productStats[itemName] = { today: 0, week: 0, month: 0, threeMonths: 0, sixMonths: 0, year: 0 };
      }

      const createdAt = new Date(pallet.created_at);
      const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (diffInDays < 1) productStats[itemName].today++;
      if (diffInDays < 7) productStats[itemName].week++;
      if (diffInDays < 30) productStats[itemName].month++;
      if (diffInDays < 90) productStats[itemName].threeMonths++;
      if (diffInDays < 180) productStats[itemName].sixMonths++;
      if (diffInDays < 365) productStats[itemName].year++;
    });

    return productStats;
  };

  const detailedStats = getDetailedStats();

  const handleAddPallet = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    try {
      if (editingId) {
        // Update existing pallet
        // We need to preserve existing signatures
        const existingPallet = pallets.find(p => p.id === editingId);
        let existingCertData: any = existingPallet?.certificate_data;
        if (typeof existingCertData === 'string') {
          try { existingCertData = JSON.parse(existingCertData); } catch (e) { existingCertData = {}; }
        }

        const updatedCertData = {
          ...existingCertData,
          ...formData,
          signatures: existingCertData?.signatures // Preserve signatures
        };

        const res = await fetchWithAuth(`/api/production/pallets/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            certificate_data: updatedCertData,
            details: `${formData.item_name} - ${formData.carton_count} كرتونة`
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل في تحديث الطبلية");

        setSuccess(`تم تحديث الطبلية بنجاح! الكود: ${editingId}`);
        handleCancelEdit(); // Reset form
      } else {
        // Create new pallet
        const palletId = `KET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
        
        const res = await fetchWithAuth("/api/production/pallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: palletId,
            type: "ketchup",
            details: `${formData.item_name} - ${formData.carton_count} كرتونة`,
            certificate_data: formData,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل في إضافة الطبلية");

        setSuccess(`تم إنتاج الطبلية بنجاح! الكود: ${palletId}`);
        setFormData({
          date: new Date().toISOString().slice(0, 10),
          department: "قسم الكاتشب والصوصات",
          item_name: "",
          filling_weight: "",
          carton_count: "",
          batch_number: "",
          production_date: new Date().toISOString().slice(0, 10),
          expiry_date: "",
          warehouse_target: "",
          certificate_number: "",
          notes: "",
        });
      }
      loadPallets();
    } catch (err: any) {
      setError(err.message || "فشل في العملية");
    } finally {
      setLoading(false);
    }
  };

  const [showSignModal, setShowSignModal] = useState(false);
  const [palletToSign, setPalletToSign] = useState<{pallet: Pallet, role: 'supervisor' | 'qc' | 'quality_officer' | 'warehouse'} | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [palletToSend, setPalletToSend] = useState<Pallet | null>(null);

  const handleSignClick = (pallet: Pallet, role: 'supervisor' | 'qc' | 'quality_officer' | 'warehouse') => {
    setPalletToSign({pallet, role});
    setShowSignModal(true);
  };

  const confirmSign = async () => {
    if (!palletToSign) return;
    const { pallet, role } = palletToSign;
    
    try {
      let certData = pallet.certificate_data;
      if (typeof certData === 'string') {
        try {
          certData = JSON.parse(certData);
        } catch (e) {
          certData = {};
        }
      }
      
      const roleNames = {
        supervisor: "مشرف قسم الكاتشب والصوصات",
        qc: "مراقب الجودة",
        quality_officer: "ضابط الجودة",
        warehouse: "مسؤول المستودع"
      };

      const updatedCertData = {
        ...certData,
        signatures: {
          ...certData?.signatures,
          [role]: {
            signed: true,
            date: new Date().toISOString(),
            name: roleNames[role]
          }
        }
      };

      const res = await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificate_data: updatedCertData }),
      });

      if (!res.ok) throw new Error("فشل في توقيع الشهادة");

      setSuccess(`تم توقيع الشهادة للطبلية ${pallet.id} بنجاح`);
      loadPallets();
      setShowSignModal(false);
      setPalletToSign(null);
    } catch (err: any) {
      setError(err.message || "فشل في توقيع الشهادة");
    }
  };

  const handleSendToWarehouse = (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try {
        certData = JSON.parse(certData);
      } catch (e) {
        certData = {};
      }
    }
    
    // Check for QC signature instead of Quality Officer
    if (!certData?.signatures?.qc?.signed) {
      setError("يجب توقيع الشهادة من قبل مراقب الجودة أولاً");
      return;
    }

    setPalletToSend(pallet);
    setShowSendModal(true);
  };

  const confirmSendToWarehouse = async () => {
    if (!palletToSend) return;
    const pallet = palletToSend;

    try {
      // Only update status to 'awaiting_quality_officer'
      // Do NOT create warehouse request yet
      const res = await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "awaiting_quality_officer"
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "فشل في تحديث الحالة");
      
      setSuccess(`تم إرسال الطبلية ${pallet.id} إلى ضابط الجودة`);
      loadPallets();
      setShowSendModal(false);
      setPalletToSend(null);
      
      if (selectedPallet && selectedPallet.id === pallet.id) {
        setSelectedPallet({ ...selectedPallet, status: 'awaiting_quality_officer' });
      }
    } catch (err: any) {
      setError(err.message || "فشل في تحديث الحالة");
    }
  };



  const [activeTab, setActiveTab] = useState<'certificate' | 'inventory'>('certificate');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">قسم إنتاج الكاتشب والصوصات 🥫</h1>
          <p className="text-gray-500 mt-2">إدارة الإنتاج والجرد</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('certificate')}
          className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'certificate' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          شهادة طبلية
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'inventory' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          جرد الطبالي
        </button>
      </div>

      {activeTab === 'certificate' ? (
        <>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200"
        >
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-red-600" />
            شهادة طبلية
          </h2>
          <div className="text-sm text-gray-500">شركة لافانت للمنتجات الغذائية - نموذج إدارة الجودة وسلامة الغذاء</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <CustomDatePicker
              label="التاريخ"
              value={formData.date}
              onChange={(date) => setFormData(prev => ({ ...prev, date }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">من قسم</label>
            <input 
              type="text" 
              value="قسم الكاتشب والصوصات" 
              disabled
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-right cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">إلى مستودع</label>
            <input
              type="text"
              value={formData.warehouse_target}
              onChange={(e) => setFormData(prev => ({ ...prev, warehouse_target: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-right"
              placeholder="اكتب اسم المستودع"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم شهادة المطابقة</label>
            <input type="text" name="certificate_number" value={formData.certificate_number} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
            <input type="text" name="item_name" value={formData.item_name} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" placeholder="مثال: كاتشب حار" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">وزن التعبئة</label>
            <input type="text" name="filling_weight" value={formData.filling_weight} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين</label>
            <input type="number" name="carton_count" value={formData.carton_count} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الخلطة</label>
            <input type="text" name="batch_number" value={formData.batch_number} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <CustomDatePicker
              label="تاريخ الإنتاج"
              value={formData.production_date}
              onChange={(date) => setFormData(prev => ({ ...prev, production_date: date }))}
            />
          </div>
          <div>
            <CustomDatePicker
              label="تاريخ الانتهاء"
              value={formData.expiry_date}
              onChange={(date) => setFormData(prev => ({ ...prev, expiry_date: date }))}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">الملاحظات</label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
        </div>

        <div className="flex justify-end gap-4">
          {editingId && (
            <button
              onClick={handleCancelEdit}
              className="px-8 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 flex items-center gap-2 font-bold shadow-lg shadow-gray-200 transition-all hover:scale-105"
            >
              إلغاء التعديل
            </button>
          )}
          <button
            onClick={handleAddPallet}
            disabled={loading}
            className={`px-8 py-3 ${editingId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'} text-white rounded-xl disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg transition-all hover:scale-105`}
          >
            {loading ? "جاري الحفظ..." : editingId ? "تحديث الشهادة" : "حفظ الشهادة وإنتاج الكود"}
            <Barcode className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
      </motion.div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            سجل الإنتاج الحديث
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">كود الطبلية</th>
                <th className="px-6 py-3 font-medium">التفاصيل</th>
                <th className="px-6 py-3 font-medium">تاريخ الإنتاج</th>
                <th className="px-6 py-3 font-medium">الحالة</th>
                <th className="px-6 py-3 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pallets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    لا يوجد إنتاج مسجل حتى الآن
                  </td>
                </tr>
              ) : (
                pallets.map((pallet) => (
                  <tr key={pallet.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-red-600 font-medium">{pallet.id}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="font-medium">{pallet.details}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(pallet.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        pallet.status === 'produced' ? 'bg-blue-100 text-blue-700' :
                        pallet.status === 'in_warehouse' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {pallet.status === 'produced' ? 'تم الإنتاج' :
                         pallet.status === 'in_warehouse' ? 'في المستودع' : pallet.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {(() => {
                          let certData: any = pallet.certificate_data;
                          if (typeof certData === 'string') {
                            try {
                              certData = JSON.parse(certData);
                            } catch (e) {
                              certData = {};
                            }
                          }
                          
                          return (
                            <>
                              {!certData?.signatures?.quality_officer?.signed && (
                                <button
                                  onClick={() => handleEditClick(pallet)}
                                  className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                                >
                                  تعديل
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedPallet(pallet);
                                  setShowDetailsModal(true);
                                }}
                                className="text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl flex items-center gap-2 transition-all border border-gray-200"
                              >
                                <FileText className="w-4 h-4" />
                                التفاصيل
                              </button>

                              {!certData?.signatures?.supervisor?.signed ? (
                                <button
                                  onClick={() => handleSignClick(pallet, 'supervisor')}
                                  className="text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-100 group"
                                >
                                  <ClipboardCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                  توقيع المشرف
                                </button>
                              ) : !certData?.signatures?.qc?.signed ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
                                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-700 font-bold">
                                    بانتظار توقيع مراقب الجودة
                                  </span>
                                </div>
                              ) : pallet.status !== 'awaiting_quality_officer' && pallet.status !== 'in_warehouse' && pallet.status !== 'awaiting_warehouse' ? (
                                <button
                                  onClick={() => handleSendToWarehouse(pallet)}
                                  className="text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 group"
                                >
                                  <Truck className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
                                  إرسال للمستودع
                                </button>
                              ) : !certData?.signatures?.quality_officer?.signed ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                  <span className="text-sm text-indigo-700 font-bold">
                                    بانتظار توقيع ضابط الجودة
                                  </span>
                                </div>
                              ) : !certData?.signatures?.warehouse?.signed ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-xl">
                                  <Truck className="w-4 h-4 text-orange-600" />
                                  <span className="text-sm text-orange-700 font-bold">
                                    بانتظار توقيع المستودع
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-green-700 font-bold">
                                    في المستودع
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      </>
      ) : (
        <div className="space-y-8">
          {/* Summary Stats Table */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-800">
                <BarChart3 className="w-6 h-6" />
                ملخص الإنتاج (عدد الطبالي)
              </h2>
              <div className="text-xs text-gray-400 font-medium">إحصائيات زمنية تلقائية</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="px-6 py-4 font-bold border-b">الصنف</th>
                    <th className="px-6 py-4 font-bold border-b text-center">اليوم</th>
                    <th className="px-6 py-4 font-bold border-b text-center">أسبوع</th>
                    <th className="px-6 py-4 font-bold border-b text-center">شهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">3 أشهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">6 أشهر</th>
                    <th className="px-6 py-4 font-bold border-b text-center">سنة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(detailedStats).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-8 h-8 opacity-20" />
                          <span>لا يوجد بيانات إنتاج مسجلة حالياً</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    Object.entries(detailedStats).map(([name, stats]) => (
                      <tr key={name} className="hover:bg-red-50/30 transition-all group">
                        <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-red-700 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            {name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-8 rounded-lg font-bold ${stats.today > 0 ? 'bg-red-100 text-red-700 shadow-sm' : 'bg-gray-50 text-gray-400'}`}>
                            {stats.today}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.week}</td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.month}</td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.threeMonths}</td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.sixMonths}</td>
                        <td className="px-6 py-4 text-center text-gray-600 font-medium">{stats.year}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Detailed Pallet List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                <List className="w-6 h-6 text-red-600" />
                سجل الطبالي التفصيلي
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold">
                  إجمالي: {pallets.length} طبلية
                </span>
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
                    <th className="px-6 py-4 font-bold border-b text-center">المستودع</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الحالة</th>
                    <th className="px-6 py-4 font-bold border-b text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pallets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                        لا يوجد مخزون مسجل
                      </td>
                    </tr>
                  ) : (
                    pallets.map((pallet) => {
                      let certData: any = {};
                      try {
                        certData = typeof pallet.certificate_data === 'string' ? JSON.parse(pallet.certificate_data) : pallet.certificate_data;
                      } catch (e) {}
                      
                      return (
                        <tr key={pallet.id} className="hover:bg-gray-50 transition-all group">
                          <td className="px-6 py-4 font-mono text-red-600 font-bold tracking-tighter">{pallet.id}</td>
                          <td className="px-6 py-4 text-gray-900 font-bold">{certData.item_name || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold text-sm">
                              {certData.carton_count || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500 text-sm font-medium">
                            {certData.production_date || '-'}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600 font-medium">{certData.warehouse_target || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm inline-block min-w-[100px] ${
                              pallet.status === 'produced' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              pallet.status === 'in_warehouse' ? 'bg-green-50 text-green-700 border border-green-100' :
                              'bg-gray-50 text-gray-700 border border-gray-100'
                            }`}>
                              {pallet.status === 'produced' ? 'تم الإنتاج' :
                               pallet.status === 'in_warehouse' ? 'في المستودع' : pallet.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => {
                                setSelectedPallet(pallet);
                                setShowDetailsModal(true);
                              }}
                              className="text-sm font-bold text-gray-600 bg-white hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl flex items-center gap-2 mx-auto transition-all border border-gray-200 shadow-sm hover:shadow-md hover:border-red-600"
                            >
                              <FileText className="w-4 h-4" />
                              عرض
                            </button>
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
      {showSendModal && palletToSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
          >
            <div className="bg-gradient-to-r from-indigo-50 to-white p-6 border-b border-indigo-100">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900">تأكيد الإرسال للمستودع</h3>
            </div>
            
            <div className="p-6 space-y-4 text-center">
              <p className="text-gray-600">
                هل أنت متأكد من إرسال الطبلية <span className="font-mono font-bold text-gray-900">{palletToSend.id}</span> إلى ضابط الجودة؟
              </p>
              <p className="text-sm text-gray-500">
                سيتم إرسال الطبلية إلى ضابط الجودة للاعتماد قبل دخول المستودع.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-3">
              <button 
                onClick={confirmSendToWarehouse}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                تأكيد الإرسال
              </button>
              <button 
                onClick={() => {
                  setShowSendModal(false);
                  setPalletToSend(null);
                }}
                className="flex-1 bg-white text-gray-700 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showSignModal && palletToSign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
          >
            <div className="bg-gradient-to-r from-green-50 to-white p-6 border-b border-green-100">
              <h3 className="text-xl font-bold text-center text-gray-900">تأكيد التوقيع</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">كود الطبلية:</span>
                  <span className="font-mono font-bold text-gray-800">{palletToSign.pallet.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الصفة:</span>
                  <span className="font-medium text-gray-800">
                    {palletToSign.role === 'supervisor' ? 'مشرف قسم الكاتشب والصوصات' :
                     palletToSign.role === 'qc' ? 'مراقب الجودة' :
                     palletToSign.role === 'quality_officer' ? 'ضابط الجودة' : 'مسؤول المستودع'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-3">
              <button 
                onClick={confirmSign}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد التوقيع
              </button>
              <button 
                onClick={() => {
                  setShowSignModal(false);
                  setPalletToSign(null);
                }}
                className="flex-1 bg-white text-gray-700 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showDetailsModal && selectedPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">تفاصيل الشهادة: {selectedPallet.id}</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">إغلاق</button>
            </div>
            
            <div className="p-6 space-y-6">
              {(() => {
                let certData: any = selectedPallet.certificate_data;
                if (typeof certData === 'string') {
                  try {
                    certData = JSON.parse(certData);
                  } catch (e) {
                    certData = {};
                  }
                }
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-gray-500">التاريخ:</span> {certData.date}</div>
                      <div><span className="text-gray-500">القسم:</span> {certData.department}</div>
                      <div><span className="text-gray-500">اسم الصنف:</span> {certData.item_name}</div>
                      <div><span className="text-gray-500">وزن التعبئة:</span> {certData.filling_weight}</div>
                      <div><span className="text-gray-500">عدد الكراتين:</span> {certData.carton_count}</div>
                      <div><span className="text-gray-500">رقم الخلطة:</span> {certData.batch_number}</div>
                      <div><span className="text-gray-500">تاريخ الإنتاج:</span> {certData.production_date || '-'}</div>
                      <div><span className="text-gray-500">تاريخ الانتهاء:</span> {certData.expiry_date || '-'}</div>
                      <div><span className="text-gray-500">رقم شهادة المطابقة:</span> {certData.certificate_number || '-'}</div>
                      <div><span className="text-gray-500">إلى مستودع:</span> {certData.warehouse_target || '-'}</div>
                    </div>

                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                          <ClipboardCheck className="w-5 h-5 text-red-600" />
                          سجل الاعتمادات والتوقيعات
                        </h4>
                        <span className="text-xs text-gray-400 font-mono">CERT-ID: {selectedPallet.id}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { role: 'supervisor', label: 'مشرف قسم الكاتشب والصوصات', color: 'red' },
                          { role: 'qc', label: 'مراقب الجودة', color: 'blue' },
                          { role: 'quality_officer', label: 'ضابط الجودة', color: 'indigo' },
                          { role: 'warehouse', label: 'مسؤول المستودع', color: 'emerald' }
                        ].map(({ role, label, color }) => {
                          const sig = certData?.signatures?.[role];
                          const colorClasses: Record<string, any> = {
                            red: { bg: 'bg-red-50/50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600', circle: 'bg-red-100' },
                            blue: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600', circle: 'bg-blue-100' },
                            emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-900', icon: 'text-emerald-600', circle: 'bg-emerald-100' },
                            indigo: { bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600', circle: 'bg-indigo-100' },
                          };
                          const colors = colorClasses[color];

                          return (
                            <div key={role} className={`relative overflow-hidden p-4 rounded-2xl border transition-all ${
                              sig?.signed 
                                ? `${colors.bg} ${colors.border} shadow-sm` 
                                : "bg-gray-50 border-gray-200 border-dashed"
                            }`}>
                              <div className="flex flex-col h-full justify-between">
                                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">{label}</div>
                                
                                {sig?.signed ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-8 h-8 rounded-full ${colors.circle} flex items-center justify-center`}>
                                        <CheckCircle className={`w-5 h-5 ${colors.icon}`} />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className={`font-serif italic text-lg ${colors.text} leading-tight`}>
                                          {sig.name}
                                        </span>
                                        <span className="text-[10px] text-gray-400 uppercase tracking-tighter">
                                          {new Date(sig.date).toLocaleDateString('ar-EG')} - {new Date(sig.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-gray-300 py-2">
                                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-gray-200" />
                                    </div>
                                    <span className="text-sm italic">بانتظار الاعتماد...</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Decorative background element */}
                              {sig?.signed && (
                                <div className={`absolute -right-4 -bottom-4 opacity-[0.03] transform rotate-12`}>
                                  <ShieldCheck className={`w-24 h-24 ${colors.text}`} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {selectedPallet.status === 'in_warehouse' ? (
                      <div className="border-t pt-4">
                        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center justify-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <div className="font-bold">في المستودع</div>
                            <div className="text-xs text-green-600 mt-0.5">تم استلام الطبلية بنجاح</div>
                          </div>
                        </div>
                      </div>
                    ) : selectedPallet.status === 'awaiting_quality_officer' ? (
                      <div className="border-t pt-4">
                        <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-xl flex items-center justify-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-bold">بانتظار ضابط الجودة</div>
                            <div className="text-xs text-indigo-600 mt-0.5">تم إرسال الطبلية للمراجعة من قبل ضابط الجودة</div>
                          </div>
                        </div>
                      </div>
                    ) : selectedPallet.status === 'awaiting_warehouse' ? (
                      <div className="border-t pt-4">
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Truck className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-bold">بانتظار المستودع</div>
                            <div className="text-xs text-emerald-600 mt-0.5">تم اعتماد الجودة، بانتظار استلام المستودع</div>
                          </div>
                        </div>
                      </div>
                    ) : certData?.signatures?.qc?.signed ? (
                      <div className="border-t pt-4">
                        <button
                          onClick={() => handleSendToWarehouse(selectedPallet)}
                          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Truck className="w-5 h-5" />
                          إرسال للمستودع
                        </button>
                      </div>
                    ) : (
                      <div className="border-t pt-4">
                        <div className="bg-gray-50 border border-gray-200 border-dashed text-gray-500 p-4 rounded-xl flex items-center justify-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <ShieldCheck className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">بانتظار توقيع مراقب الجودة</div>
                            <div className="text-xs text-gray-400 mt-0.5">يجب توقيع الشهادة من قبل مراقب الجودة للمتابعة</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ProductionKetchup;
