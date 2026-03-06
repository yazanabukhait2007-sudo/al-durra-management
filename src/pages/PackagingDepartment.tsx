import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Package, CheckCircle, AlertCircle, ArrowRight, Truck, Barcode, ClipboardCheck, Play, Box } from "lucide-react";
import { fetchWithAuth } from "../utils/api";

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
  const [incomingPallets, setIncomingPallets] = useState<Pallet[]>([]);
  const [stockPallets, setStockPallets] = useState<Pallet[]>([]);
  const [processingPallets, setProcessingPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [certFormData, setCertFormData] = useState<any>({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    loadIncomingPallets();
    loadStockPallets();
    loadProcessingPallets();
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

  const handleSendToWarehouse = async (id: string) => {
    // This is now handled by QC, but we might keep it if QC approves and then Packaging sends?
    // The user flow says: QC signs -> Send to Warehouse.
    // So this button might be disabled until QC signs.
    // Let's check if QC signed.
    const pallet = processingPallets.find(p => p.id === id);
    let qcSigned = false;
    try {
      const cert = JSON.parse(pallet?.packaging_certificate_data || '{}');
      qcSigned = cert?.signatures?.qc?.signed;
    } catch (e) {}

    if (!qcSigned) {
      alert("يجب توقيع مراقب الجودة قبل الإرسال للمستودع");
      return;
    }

    if (!confirm("هل أنت متأكد من إرسال هذه الطبلية إلى المستودع؟")) return;
    try {
      const res = await fetchWithAuth(`/api/packaging/warehouse/${id}`, { method: "PUT" });
      if (!res.ok) throw new Error("فشل في الإرسال للمستودع");

      // Create a warehouse request
      await fetchWithAuth("/api/warehouse/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pallet_id: id,
          status: "pending"
        }),
      });

      setSuccess(`تم إرسال الطبلية ${id} إلى المستودع`);
      loadAllData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">قسم التغليف 📦</h1>
          <p className="text-gray-500 mt-2">استلام الإنتاج، المخزون، التغليف، وإصدار الشهادات</p>
        </div>
      </header>

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
                            onClick={() => handleSendToWarehouse(pallet.id)}
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
                  <label className="block text-sm text-gray-600 mb-1 text-right">التاريخ</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={certFormData.date} 
                      onChange={e => setCertFormData({...certFormData, date: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-left"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1 text-right">من قسم</label>
                  <input 
                    type="text" 
                    value={certFormData.department} 
                    readOnly
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-center"
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
                    <label className="block text-sm text-gray-600 mb-1 text-right">تاريخ الانتهاء</label>
                    <input 
                      type="date" 
                      value={certFormData.expiry_date} 
                      onChange={e => setCertFormData({...certFormData, expiry_date: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1 text-right">تاريخ الإنتاج</label>
                    <input 
                      type="date" 
                      value={certFormData.production_date} 
                      onChange={e => setCertFormData({...certFormData, production_date: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-sm"
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
    </div>
  );
};

export default PackagingDepartment;
