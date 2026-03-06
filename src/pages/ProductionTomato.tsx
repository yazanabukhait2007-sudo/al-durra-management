import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Package, ArrowRight, CheckCircle, AlertCircle, Barcode, Truck, FileText, ChevronDown, ClipboardCheck, ShieldCheck } from "lucide-react";
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
  };
}

const ProductionTomato = () => {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [palletToAction, setPalletToAction] = useState<Pallet | null>(null);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);

  const [formData, setFormData] = useState<PalletCertificate>({
    date: new Date().toISOString().slice(0, 10),
    department: "قسم البندورة",
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
      const res = await fetchWithAuth("/api/production/pallets?type=tomato");
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

  const handleAddPallet = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    
    // Generate a unique ID for the pallet (e.g., TOM-YYYYMMDD-XXXX)
    const palletId = `TOM-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await fetchWithAuth("/api/production/pallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: palletId,
          type: "tomato",
          details: `${formData.item_name} - ${formData.carton_count} كرتونة`,
          certificate_data: formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "فشل في إضافة الطبلية");

      setSuccess(`تم إنتاج الطبلية بنجاح! الكود: ${palletId}`);
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        department: "قسم البندورة",
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
      loadPallets();
    } catch (err: any) {
      setError(err.message || "فشل في إضافة الطبلية");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (pallet: Pallet) => {
    setPalletToAction(pallet);
    setShowSignModal(true);
  };

  const confirmSign = async () => {
    if (!palletToAction) return;
    const pallet = palletToAction;
    setShowSignModal(false);

    try {
      let certData: any = pallet.certificate_data;
      if (typeof certData === 'string') {
        try {
          certData = JSON.parse(certData);
        } catch (e) {
          certData = {};
        }
      }
      
      const updatedCertData = {
        ...certData,
        signatures: {
          ...(certData?.signatures || {}),
          supervisor: {
            signed: true,
            date: new Date().toISOString(),
            name: "مشرف قسم البندورة"
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
    } catch (err: any) {
      setError(err.message || "فشل في توقيع الشهادة");
    }
  };

  const handleSendToPackaging = async (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try {
        certData = JSON.parse(certData);
      } catch (e) {
        certData = {};
      }
    }
    
    if (!certData?.signatures?.supervisor?.signed) {
      setError("يجب توقيع الشهادة من قبل مشرف القسم أولاً");
      return;
    }

    setPalletToAction(pallet);
    setShowSendModal(true);
  };

  const confirmSendToPackaging = async () => {
    if (!palletToAction) return;
    const pallet = palletToAction;
    setShowSendModal(false);

    try {
      const res = await fetchWithAuth(`/api/packaging/receive/${pallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "فشل في تحديث الحالة");
      
      setSuccess(`تم إرسال الطبلية ${pallet.id} إلى التغليف بنجاح`);
      loadPallets();
    } catch (err: any) {
      setError(err.message || "فشل في تحديث الحالة");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">قسم إنتاج البندورة 🍅</h1>
          <p className="text-gray-500 mt-2">شهادة طبلية للمنتجات الغذائية</p>
        </div>
      </header>

      {/* Pallet Certificate Form */}
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
            <div className="relative">
              <button
                onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-red-500 transition-all focus:ring-2 focus:ring-red-500 outline-none"
              >
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDeptDropdown ? 'rotate-180' : ''}`} />
                <span className="text-gray-700">{formData.department}</span>
              </button>

              <AnimatePresence>
                {showDeptDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDeptDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                    >
                      {["قسم البندورة", "قسم الكاتشب", "قسم التغليف"].map((dept) => (
                        <button
                          key={dept}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, department: dept }));
                            setShowDeptDropdown(false);
                          }}
                          className={`w-full text-right px-4 py-2 text-sm transition-colors hover:bg-red-50 flex items-center justify-between ${
                            formData.department === dept ? 'text-red-600 bg-red-50 font-bold' : 'text-gray-600'
                          }`}
                        >
                          {formData.department === dept && <CheckCircle className="w-4 h-4" />}
                          {dept}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-right">إلى مستودع</label>
            <div className="relative">
              <button
                onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-red-500 transition-all focus:ring-2 focus:ring-red-500 outline-none"
              >
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWarehouseDropdown ? 'rotate-180' : ''}`} />
                <span className="text-gray-700">{formData.warehouse_target || "اختر المستودع"}</span>
              </button>

              <AnimatePresence>
                {showWarehouseDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowWarehouseDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                    >
                      {["مستودع الإنتاج التام", "مستودع المواد الخام", "مستودع التغليف"].map((wh) => (
                        <button
                          key={wh}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, warehouse_target: wh }));
                            setShowWarehouseDropdown(false);
                          }}
                          className={`w-full text-right px-4 py-2 text-sm transition-colors hover:bg-red-50 flex items-center justify-between ${
                            formData.warehouse_target === wh ? 'text-red-600 bg-red-50 font-bold' : 'text-gray-600'
                          }`}
                        >
                          {formData.warehouse_target === wh && <CheckCircle className="w-4 h-4" />}
                          {wh}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم شهادة المطابقة</label>
            <input type="text" name="certificate_number" value={formData.certificate_number} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
            <input type="text" name="item_name" value={formData.item_name} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" placeholder="مثال: بندورة حب" />
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

        {/* Signatures Section (Read-only) */}
        <div className="border-t pt-6 mb-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            نظرة عامة على الاعتمادات المطلوبة
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'مشرف الإنتاج', color: 'red' },
              { label: 'مراقب الجودة', color: 'blue' },
              { label: 'ضابط الجودة', color: 'indigo' },
              { label: 'المستودع', color: 'emerald' }
            ].map(({ label, color }) => {
              const colorClasses: Record<string, any> = {
                red: { bg: 'bg-red-50/30', border: 'border-red-100', text: 'text-red-400' },
                blue: { bg: 'bg-blue-50/30', border: 'border-blue-100', text: 'text-blue-400' },
                indigo: { bg: 'bg-indigo-50/30', border: 'border-indigo-100', text: 'text-indigo-400' },
                emerald: { bg: 'bg-emerald-50/30', border: 'border-emerald-100', text: 'text-emerald-400' },
              };
              const colors = colorClasses[color];
              return (
                <div key={label} className={`p-3 rounded-xl border border-dashed ${colors.bg} ${colors.border} flex flex-col items-center justify-center text-center space-y-1`}>
                  <div className={`text-[10px] font-bold uppercase ${colors.text}`}>{label}</div>
                  <div className="text-[10px] text-gray-400 italic">بانتظار الإجراء</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={handleAddPallet}
            disabled={loading}
            className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg shadow-red-200 transition-all hover:scale-105"
          >
            {loading ? "جاري الحفظ..." : "حفظ الشهادة وإنتاج الكود"}
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

      {/* Recent Production List */}
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
                      {pallet.certificate_data && (
                        <div className="text-xs text-gray-400 mt-1">شهادة موثقة</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(pallet.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        pallet.status === 'produced' ? 'bg-blue-100 text-blue-700' :
                        pallet.status === 'in_packaging' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {pallet.status === 'produced' ? 'تم الإنتاج' :
                         pallet.status === 'in_packaging' ? 'في التغليف' : pallet.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {pallet.status === 'produced' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              let certData = pallet.certificate_data;
                              if (typeof certData === 'string') {
                                try {
                                  certData = JSON.parse(certData);
                                } catch (e) {
                                  certData = {};
                                }
                              }
                              setSelectedPallet({ ...pallet, certificate_data: certData });
                              setShowDetailsModal(true);
                            }}
                            className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl flex items-center gap-2 transition-all border border-blue-100"
                          >
                            <FileText className="w-4 h-4" />
                            التفاصيل
                          </button>
                          
                          {(() => {
                            let certData = pallet.certificate_data;
                            if (typeof certData === 'string') {
                              try {
                                certData = JSON.parse(certData);
                              } catch (e) {
                                certData = {};
                              }
                            }
                            
                            if (!certData?.signatures?.supervisor?.signed) {
                              return (
                                <button
                                  onClick={() => handleSign(pallet)}
                                  className="text-sm font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-green-100 group"
                                >
                                  <ClipboardCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                  توقيع المشرف
                                </button>
                              );
                            } else {
                              return (
                                <button
                                  onClick={() => handleSendToPackaging(pallet)}
                                  className="text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 group"
                                >
                                  إرسال للتغليف
                                  <ArrowRight className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
                                </button>
                              );
                            }
                          })()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showSignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            >
              <div className="bg-gradient-to-r from-green-50 to-white p-6 border-b border-green-100">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900">تأكيد التوقيع</h3>
              </div>
              
              <div className="p-6 space-y-4 text-center">
                <p className="text-gray-600">
                  هل أنت متأكد من توقيع هذه الشهادة بصفتك <span className="font-bold text-gray-900">مشرف قسم البندورة</span>؟
                </p>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm font-mono text-gray-500">
                  ID: {palletToAction?.id}
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t flex gap-3">
                <button 
                  onClick={confirmSign}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
                >
                  تأكيد التوقيع
                </button>
                <button 
                  onClick={() => setShowSignModal(false)}
                  className="flex-1 bg-white text-gray-700 border border-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSendModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            >
              <div className="bg-gradient-to-r from-indigo-50 to-white p-6 border-b border-indigo-100">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900">تأكيد الإرسال للتغليف</h3>
              </div>
              
              <div className="p-6 space-y-4 text-center">
                <p className="text-gray-600">
                  هل أنت متأكد من إرسال الطبلية <span className="font-bold text-gray-900">{palletToAction?.id}</span> إلى قسم التغليف؟
                </p>
              </div>

              <div className="p-4 bg-gray-50 border-t flex gap-3">
                <button 
                  onClick={confirmSendToPackaging}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  تأكيد الإرسال
                </button>
                <button 
                  onClick={() => setShowSendModal(false)}
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
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100"
            >
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-gray-900">تفاصيل شهادة الطبلية</h3>
                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">كود الطبلية</label>
                    <div className="font-mono font-bold text-lg text-red-600">{selectedPallet.id}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">التاريخ</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.date || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">الصنف</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.item_name || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">الوزن</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.filling_weight || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">عدد الكراتين</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.carton_count || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">رقم الخلطة</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.batch_number || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">تاريخ الإنتاج</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.production_date || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">تاريخ الانتهاء</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.expiry_date || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">رقم شهادة المطابقة</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.certificate_number || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">إلى مستودع</label>
                    <div className="font-medium text-gray-900">{(selectedPallet.certificate_data as any)?.warehouse_target || '-'}</div>
                  </div>
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
                      { role: 'supervisor', label: 'مشرف قسم البندورة', color: 'red' },
                      { role: 'qc', label: 'مراقب الجودة', color: 'blue' },
                      { role: 'warehouse', label: 'مسؤول المستودع', color: 'emerald' },
                      { role: 'quality_officer', label: 'ضابط الجودة', color: 'indigo' }
                    ].map(({ role, label, color }) => {
                      const sig = (selectedPallet.certificate_data as any)?.signatures?.[role];
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
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all"
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

export default ProductionTomato;
