import React, { useState, useEffect } from "react";
import { Warehouse, Package, Box, ArrowDownCircle, CheckCircle, Truck, ClipboardCheck, Barcode, X, Calendar as CalendarIcon, FileText, ChevronDown, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { fetchWithAuth } from "../utils/api";
import CustomDatePicker from "../components/CustomDatePicker";

const WarehousePage = () => {
  const [activeMainTab, setActiveMainTab] = useState<'internal' | 'external'>('internal');
  const [activeInternalTab, setActiveInternalTab] = useState<'production' | 'raw' | 'requests'>('production');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showModalDeptDropdown, setShowModalDeptDropdown] = useState(false);
  const [showModalWarehouseDropdown, setShowModalWarehouseDropdown] = useState(false);
  const [showModalDateDropdown, setShowModalDateDropdown] = useState(false);
  const [showModalExpiryDropdown, setShowModalExpiryDropdown] = useState(false);
  const [showModalProductionDropdown, setShowModalProductionDropdown] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [pallets, setPallets] = useState<any[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<any>(null);
  
  const loadRequests = async () => {
    try {
      const res = await fetchWithAuth("/api/warehouse/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("فشل في تحميل الطلبات", err);
    }
  };

  const loadPallets = async () => {
    try {
      const res = await fetchWithAuth("/api/warehouse/stock");
      if (res.ok) {
        const data = await res.json();
        setPallets(data);
      }
    } catch (err) {
      console.error("فشل في تحميل الطبالي", err);
    }
  };

  useEffect(() => {
    if (activeInternalTab === 'requests') {
      loadRequests();
    } else if (activeInternalTab === 'production') {
      loadPallets();
    }
  }, [activeInternalTab]);

  const translateLocation = (loc: string) => {
    switch(loc) {
      case 'internal_production': return 'قسم الإنتاج';
      case 'internal_raw_materials': return 'مواد خام';
      case 'external': return 'مستودع خارجي';
      default: return loc;
    }
  };

  const [productionType, setProductionType] = useState<'tomato' | 'ketchup'>('tomato');
  const [palletCode, setPalletCode] = useState('');
  const [certData, setCertData] = useState({
    date: new Date().toISOString().slice(0, 10),
    department: "قسم الإنتاج",
    item_name: '',
    filling_weight: '',
    carton_count: '',
    batch_number: '',
    production_date: new Date().toISOString().slice(0, 10),
    expiry_date: '',
    warehouse_target: '',
    certificate_number: '',
    notes: '',
    signatures: {
      supervisor: { signed: false, name: 'مشرف الإنتاج', date: '' },
      qc: { signed: false, name: 'مراقب الجودة', date: '' },
      quality_officer: { signed: false, name: 'ضابط الجودة', date: '' },
      warehouse: { signed: false, name: 'مسؤول المستودع', date: '' }
    }
  });

  // Generate pallet code when type changes
  useEffect(() => {
    const prefix = productionType === 'tomato' ? 'TOM' : 'KET';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    setPalletCode(`${prefix}-${datePart}-${randomPart}`);
  }, [productionType]);

  const handleAddProduction = async () => {
    try {
      const res = await fetchWithAuth("/api/production/pallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pallet_id: palletCode,
          type: productionType,
          details: certData.item_name,
          certificate_data: certData,
          location: 'internal_production'
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setCertData({
          date: new Date().toISOString().slice(0, 10),
          department: "قسم الإنتاج",
          item_name: '',
          filling_weight: '',
          carton_count: '',
          batch_number: '',
          production_date: new Date().toISOString().slice(0, 10),
          expiry_date: '',
          warehouse_target: '',
          certificate_number: '',
          notes: '',
          signatures: {
            supervisor: { signed: false, name: 'مشرف الإنتاج', date: '' },
            qc: { signed: false, name: 'مراقب الجودة', date: '' },
            quality_officer: { signed: false, name: 'ضابط الجودة', date: '' },
            warehouse: { signed: false, name: 'مسؤول المستودع', date: '' }
          }
        });
        loadPallets();
      }
    } catch (err) {
      console.error("فشل في إضافة الطبلية", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">المستودع 📦</h1>
          <p className="text-gray-500 mt-2">إدارة المخزون والطلبات</p>
        </div>
      </header>

      {/* Main Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveMainTab('internal')}
          className={`pb-4 px-4 font-bold transition-colors ${
            activeMainTab === 'internal' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          المستودع الداخلي
        </button>
        <button
          onClick={() => setActiveMainTab('external')}
          className={`pb-4 px-4 font-bold transition-colors ${
            activeMainTab === 'external' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          المستودع الخارجي
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeMainTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]"
      >
        {activeMainTab === 'internal' ? (
          <div className="space-y-6">
            {/* Internal Sub-tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setActiveInternalTab('production')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeInternalTab === 'production' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                قسم الإنتاج
              </button>
              <button
                onClick={() => setActiveInternalTab('raw')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeInternalTab === 'raw' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                مواد الخام
              </button>
              <button
                onClick={() => setActiveInternalTab('requests')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${activeInternalTab === 'requests' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
              >
                طلبات المستودع
              </button>
            </div>

            <div className="py-10 text-center">
              {activeInternalTab === 'production' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Package className="w-6 h-6 text-blue-600" />
                      <h2 className="text-xl font-bold">سجل الإنتاج الحديث</h2>
                    </div>
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 flex items-center gap-2"
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                      إضافة الإنتاج الجاهز
                    </button>
                  </div>
                  
                  {pallets.length === 0 ? (
                    <div className="text-gray-500 py-10">لا توجد طبالي في قسم الإنتاج</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-600 text-sm border-b">
                            <th className="p-4 font-bold">كود الطبلية</th>
                            <th className="p-4 font-bold">التفاصيل</th>
                            <th className="p-4 font-bold">تاريخ الإنتاج</th>
                            <th className="p-4 font-bold">الحالة</th>
                            <th className="p-4 font-bold">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pallets.map((pallet) => {
                            let details: any = {};
                            try {
                              if (pallet.packaging_certificate_data) {
                                details = JSON.parse(pallet.packaging_certificate_data);
                              } else {
                                details = pallet.certificate_data || pallet.details;
                                if (typeof details === 'string') {
                                  try { details = JSON.parse(details); } catch(e) {}
                                }
                              }
                            } catch (e) {}

                            return (
                            <tr key={pallet.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-4 font-mono text-sm font-bold text-blue-600">{pallet.pallet_id}</td>
                              <td className="p-4 text-sm text-gray-700">{details.item_name || pallet.details || 'بدون تفاصيل'}</td>
                              <td className="p-4 text-sm text-gray-600">{details.production_date || new Date(pallet.added_at).toLocaleDateString('ar-EG')}</td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                  pallet.location === 'internal_production' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {translateLocation(pallet.location)}
                                </span>
                              </td>
                              <td className="p-4">
                                <button onClick={() => {
                                  try {
                                    let details;
                                    let isPackaging = false;
                                    if (pallet.packaging_certificate_data) {
                                      details = JSON.parse(pallet.packaging_certificate_data);
                                      isPackaging = true;
                                    } else {
                                      details = pallet.certificate_data || pallet.details;
                                      if (typeof details === 'string') {
                                        try { details = JSON.parse(details); } catch(e) {}
                                      }
                                    }
                                    setSelectedDetails({ ...(details || {info: "لا توجد تفاصيل"}), _pallet_id: pallet.pallet_id, _is_packaging: isPackaging });
                                  } catch (e) { setSelectedDetails({error: "خطأ في قراءة التفاصيل"}); }
                                }} className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  عرض الشهادة
                                </button>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {activeInternalTab === 'raw' && (
                <>
                  <Box className="w-16 h-16 text-blue-200 mx-auto mb-4" />
                  <h2 className="text-xl font-bold">مواد الخام</h2>
                </>
              )}
              {activeInternalTab === 'requests' && (
                <div className="w-full">
                  <h2 className="text-xl font-bold mb-6">طلبات المستودع</h2>
                  {requests.length === 0 ? (
                    <div className="text-gray-500">لا توجد طلبات معلقة</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="p-3">كود الطبلية</th>
                            <th className="p-3">تفاصيل الشهادة</th>
                            <th className="p-3">الحالة</th>
                            <th className="p-3">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requests.map((req) => {
                            let certData: any = {};
                            let isPackaging = false;
                            try {
                              if (req.packaging_certificate_data) {
                                certData = JSON.parse(req.packaging_certificate_data);
                                isPackaging = true;
                              } else {
                                certData = JSON.parse(req.certificate_data || req.pallet_details || "{}");
                              }
                            } catch (e) {}
                            return (
                            <tr key={req.id} className="border-b">
                              <td className="p-3 font-mono">{req.pallet_id}</td>
                              <td className="p-3">
                                <button onClick={() => {
                                  setSelectedDetails({ ...(certData || {info: "لا توجد تفاصيل"}), _pallet_id: req.pallet_id, _is_packaging: isPackaging });
                                }} className="text-blue-600 hover:underline">عرض التفاصيل {isPackaging ? '(تغليف)' : ''}</button>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                  {req.status === 'pending' ? 'معلق' : 'مكتمل'}
                                </span>
                              </td>
                              <td className="p-3">
                                {req.status === 'pending' && (
                                  <button 
                                    onClick={async () => {
                                      const updatedCertData = {
                                        ...(certData || {}),
                                        signatures: {
                                          ...(certData?.signatures || {}),
                                          warehouse: {
                                            signed: true,
                                            name: "مسؤول المستودع",
                                            date: new Date().toISOString()
                                          }
                                        }
                                      };

                                      const body = isPackaging 
                                        ? { packaging_certificate_data: updatedCertData }
                                        : { certificate_data: updatedCertData };

                                      await fetchWithAuth(`/api/production/pallets/${req.pallet_id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body)
                                      });

                                      await fetchWithAuth(`/api/warehouse/requests/${req.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status: 'completed' })
                                      });
                                      loadRequests();
                                    }}
                                    className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    توقيع الاستلام
                                  </button>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {/* Details Modal */}
              {selectedDetails && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 text-right"
                  >
                    <div className="bg-white p-6 border-b flex justify-between items-center">
                      <button onClick={() => setSelectedDetails(null)} className="text-gray-500 hover:text-gray-700 text-sm">إغلاق</button>
                      <h3 className="text-lg font-bold text-gray-900" dir="ltr">تفاصيل الشهادة: {selectedDetails._pallet_id}</h3>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      {typeof selectedDetails === 'object' && selectedDetails !== null && !selectedDetails.error && !selectedDetails.info ? (
                        <>
                          <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                            <div className="text-right"><span className="text-gray-500 ml-1">التاريخ:</span> <span className="font-medium text-gray-900">{selectedDetails.date || 'غير محدد'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">القسم:</span> <span className="font-medium text-gray-900">{selectedDetails.department || 'غير محدد'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">اسم الصنف:</span> <span className="font-medium text-gray-900">{selectedDetails.item_name || 'غير محدد'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">وزن التعبئة:</span> <span className="font-medium text-gray-900">{selectedDetails.filling_weight || 'غير محدد'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">عدد الكراتين:</span> <span className="font-medium text-gray-900">{selectedDetails.carton_count || 'غير محدد'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">رقم الخلطة:</span> <span className="font-medium text-gray-900">{selectedDetails.batch_number || 'غير محدد'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">تاريخ الإنتاج:</span> <span className="font-medium text-gray-900">{selectedDetails.production_date || '-'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">تاريخ الانتهاء:</span> <span className="font-medium text-gray-900">{selectedDetails.expiry_date || '-'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">رقم شهادة المطابقة:</span> <span className="font-medium text-gray-900">{selectedDetails.certificate_number || '-'}</span></div>
                            <div className="text-right"><span className="text-gray-500 ml-1">إلى مستودع:</span> <span className="font-medium text-gray-900">{selectedDetails.warehouse_target || '-'}</span></div>
                            {selectedDetails.packaging_type && (
                              <div className="text-right"><span className="text-gray-500 ml-1">نوع التغليف:</span> <span className="font-medium text-gray-900">{selectedDetails.packaging_type}</span></div>
                            )}
                            {selectedDetails.weight_after_packaging && (
                              <div className="text-right"><span className="text-gray-500 ml-1">الوزن بعد التغليف:</span> <span className="font-medium text-gray-900">{selectedDetails.weight_after_packaging}</span></div>
                            )}
                          </div>

                          <div className="border-t pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                                سجل الاعتمادات والتوقيعات
                              </h4>
                              <span className="text-xs text-gray-400 font-mono">CERT-ID: {selectedDetails._pallet_id}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {[
                                { role: 'supervisor', label: selectedDetails.department === 'قسم البندورة' ? 'مشرف قسم البندورة' : 'مشرف قسم الكاتشب والصوصات', color: 'red' },
                                { role: 'qc', label: 'مراقب الجودة', color: 'blue' },
                                { role: 'warehouse', label: 'مسؤول المستودع', color: 'emerald' },
                                { role: 'quality_officer', label: 'ضابط الجودة', color: 'indigo' }
                              ].map(({ role, label, color }) => {
                                const sig = selectedDetails?.signatures?.[role];
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
                          
                          {activeInternalTab === 'requests' && selectedDetails._pallet_id && (
                            requests.find(r => r.pallet_id === selectedDetails._pallet_id)?.status === 'pending' ? (
                              <button 
                                onClick={async () => {
                                  const req = requests.find(r => r.pallet_id === selectedDetails._pallet_id);
                                  if (req && req.status === 'pending') {
                                    const isPackaging = selectedDetails._is_packaging;
                                    // Update the certificate data with warehouse signature
                                    const updatedCertData = {
                                      ...(selectedDetails || {}),
                                      signatures: {
                                        ...(selectedDetails?.signatures || {}),
                                        warehouse: {
                                          signed: true,
                                          name: "مسؤول المستودع", // Ideally from user context
                                          date: new Date().toISOString()
                                        }
                                      }
                                    };
                                    
                                    // Remove internal fields
                                    delete updatedCertData._pallet_id;
                                    delete updatedCertData._is_packaging;

                                    const body = isPackaging 
                                        ? { packaging_certificate_data: updatedCertData }
                                        : { certificate_data: updatedCertData };
                                    
                                    // Update pallet certificate data
                                    await fetchWithAuth(`/api/production/pallets/${selectedDetails._pallet_id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify(body)
                                    });

                                    // Update request status
                                    await fetchWithAuth(`/api/warehouse/requests/${req.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'completed' })
                                    });
                                    
                                    await loadRequests();
                                    // Update local state to reflect the signature immediately
                                    setSelectedDetails({...updatedCertData, _pallet_id: selectedDetails._pallet_id, _is_packaging: isPackaging});
                                  }
                                }}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 mt-4"
                              >
                                <CheckCircle className="w-5 h-5" />
                                توقيع الاستلام
                              </button>
                            ) : (
                              <div className="mt-4 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center justify-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                  <div className="font-bold">تم الاستلام</div>
                                  <div className="text-xs text-green-600 mt-0.5">تم توقيع الشهادة بنجاح</div>
                                </div>
                              </div>
                            )
                          )}
                        </>
                      ) : (
                        <div className="text-center text-gray-500 py-10">
                          {selectedDetails?.error || selectedDetails?.info || String(selectedDetails)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <Warehouse className="w-16 h-16 text-blue-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">المستودع الخارجي</h2>
            <p className="text-gray-500">إدارة المخزون الخارجي والشحن.</p>
          </div>
        )}
      </motion.div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
            >
              {/* Modal Header */}
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
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto bg-white">
                {/* Type Selection */}
                <div className="flex gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-blue-600 mb-2 text-right">نوع الإنتاج</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setProductionType('tomato')}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${productionType === 'tomato' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200'}`}
                      >
                        بندورة
                      </button>
                      <button
                        onClick={() => setProductionType('ketchup')}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${productionType === 'ketchup' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-600 border border-blue-200'}`}
                      >
                        كاتشب
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <label className="block text-xs font-bold text-blue-600 mb-2">كود الطبلية</label>
                    <div className="bg-white px-4 py-2 rounded-lg border border-blue-200 font-mono font-bold text-blue-700 text-center">
                      {palletCode}
                    </div>
                  </div>
                </div>

                {/* Top Section */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <CustomDatePicker
                      label="التاريخ"
                      value={certData.date}
                      onChange={(date) => setCertData({...certData, date})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">من قسم</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowModalDeptDropdown(!showModalDeptDropdown)}
                        className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-xl bg-white hover:border-gray-400 transition-all focus:ring-2 focus:ring-red-500 outline-none"
                      >
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showModalDeptDropdown ? 'rotate-180' : ''}`} />
                        <span className="text-gray-700">{certData.department}</span>
                      </button>

                      <AnimatePresence>
                        {showModalDeptDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowModalDeptDropdown(false)} />
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
                                    setCertData({...certData, department: dept});
                                    setShowModalDeptDropdown(false);
                                  }}
                                  className={`w-full text-right px-4 py-2.5 text-sm transition-colors hover:bg-red-50 flex items-center justify-between ${
                                    certData.department === dept ? 'text-red-600 bg-red-50 font-bold' : 'text-gray-600'
                                  }`}
                                >
                                  {certData.department === dept && <CheckCircle className="w-4 h-4" />}
                                  {dept}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">إلى مستودع</label>
                    <div className="relative">
                      <button
                        onClick={() => setShowModalWarehouseDropdown(!showModalWarehouseDropdown)}
                        className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-300 rounded-xl bg-white hover:border-gray-400 transition-all focus:ring-2 focus:ring-red-500 outline-none"
                      >
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showModalWarehouseDropdown ? 'rotate-180' : ''}`} />
                        <span className="text-gray-700">{certData.warehouse_target}</span>
                      </button>

                      <AnimatePresence>
                        {showModalWarehouseDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowModalWarehouseDropdown(false)} />
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
                                    setCertData({...certData, warehouse_target: wh});
                                    setShowModalWarehouseDropdown(false);
                                  }}
                                  className={`w-full text-right px-4 py-2.5 text-sm transition-colors hover:bg-red-50 flex items-center justify-between ${
                                    certData.warehouse_target === wh ? 'text-red-600 bg-red-50 font-bold' : 'text-gray-600'
                                  }`}
                                >
                                  {certData.warehouse_target === wh && <CheckCircle className="w-4 h-4" />}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رقم شهادة المطابقة</label>
                    <input 
                      type="text" 
                      value={certData.certificate_number} 
                      onChange={e => setCertData({...certData, certificate_number: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-right"
                    />
                  </div>
                </div>

                {/* Gray Box Section */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">عدد الكراتين</label>
                      <input 
                        type="number" 
                        value={certData.carton_count} 
                        onChange={e => setCertData({...certData, carton_count: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">وزن التعبئة</label>
                      <input 
                        type="text" 
                        value={certData.filling_weight} 
                        onChange={e => setCertData({...certData, filling_weight: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الصنف</label>
                      <input 
                        type="text" 
                        value={certData.item_name} 
                        onChange={e => setCertData({...certData, item_name: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                        placeholder="مثال: بندورة حب"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <CustomDatePicker
                        label="تاريخ الانتهاء"
                        value={certData.expiry_date}
                        onChange={(date) => setCertData({...certData, expiry_date: date})}
                      />
                    </div>
                    <div>
                      <CustomDatePicker
                        label="تاريخ الإنتاج"
                        value={certData.production_date}
                        onChange={(date) => setCertData({...certData, production_date: date})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-right">رقم الخلطة</label>
                      <input 
                        type="text" 
                        value={certData.batch_number} 
                        onChange={e => setCertData({...certData, batch_number: e.target.value})}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الملاحظات</label>
                  <textarea 
                    value={certData.notes} 
                    onChange={e => setCertData({...certData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-right"
                  />
                </div>

                {/* Signatures Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 text-right">التوقيعات والموافقات</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'warehouse', label: 'توقيع المستودع', sub: 'بانتظار الاستلام' },
                      { id: 'quality_officer', label: 'توقيع ضابط الجودة', sub: 'بانتظار الموافقة' },
                      { id: 'qc', label: 'توقيع مراقب الجودة', sub: 'بانتظار الموافقة' },
                      { id: 'supervisor', label: 'توقيع مشرف الإنتاج', sub: 'بانتظار الموافقة' },
                    ].map((sig) => (
                      <button
                        key={sig.id}
                        onClick={() => {
                          const current = (certData.signatures as any)[sig.id];
                          setCertData({
                            ...certData,
                            signatures: {
                              ...certData.signatures,
                              [sig.id]: {
                                ...current,
                                signed: !current.signed,
                                date: !current.signed ? new Date().toISOString() : ''
                              }
                            }
                          });
                        }}
                        className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-1 ${
                          (certData.signatures as any)[sig.id].signed 
                            ? "bg-green-50 border-green-500 text-green-700" 
                            : "bg-gray-50 border-gray-200 border-dashed text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase">{sig.label}</span>
                        {(certData.signatures as any)[sig.id].signed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                        )}
                        <span className="text-[9px] opacity-75">
                          {(certData.signatures as any)[sig.id].signed ? 'تم التوقيع' : sig.sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleAddProduction}
                    className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                  >
                    <Barcode className="w-5 h-5" />
                    حفظ الشهادة وإنتاج الكود
                  </button>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="px-8 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WarehousePage;
