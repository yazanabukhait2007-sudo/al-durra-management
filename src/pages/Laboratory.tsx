import React, { useState, useEffect } from "react";
import { ShieldCheck, UserCheck, Package, CheckCircle, ClipboardCheck } from "lucide-react";
import { motion } from "motion/react";
import { fetchWithAuth } from "../utils/api";
import CustomDatePicker from "../components/CustomDatePicker";

interface Pallet {
  id: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  certificate_data?: string;
  packaging_certificate_data?: string;
}

const Laboratory = () => {
  const [activeTab, setActiveTab] = useState<'controller' | 'officer'>('controller');
  const [qcPallets, setQcPallets] = useState<Pallet[]>([]);
  const [packagingQcPallets, setPackagingQcPallets] = useState<Pallet[]>([]);
  const [officerPallets, setOfficerPallets] = useState<Pallet[]>([]);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [palletToSign, setPalletToSign] = useState<{pallet: Pallet, role: 'qc' | 'quality_officer', type: 'production' | 'packaging'} | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPallet, setEditingPallet] = useState<Pallet | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [error, setError] = useState("");

  useEffect(() => {
    loadPallets();
  }, []);

  const loadPallets = async () => {
    try {
      const [ketchupRes, tomatoRes, packagingRes] = await Promise.all([
        fetchWithAuth("/api/production/pallets?type=ketchup"),
        fetchWithAuth("/api/production/pallets?type=tomato"),
        fetchWithAuth("/api/packaging/processing")
      ]);

      let allProductionPallets: Pallet[] = [];
      
      if (ketchupRes.ok) {
        const data = await ketchupRes.json();
        allProductionPallets = [...allProductionPallets, ...data];
      }
      
      if (tomatoRes.ok) {
        const data = await tomatoRes.json();
        allProductionPallets = [...allProductionPallets, ...data];
      }

      setQcPallets(allProductionPallets.filter((p: Pallet) => {
        let certData: any = p.certificate_data;
        if (typeof certData === 'string') {
          try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
        }
        return certData?.signatures?.supervisor?.signed && !certData?.signatures?.qc?.signed;
      }));
      
      if (packagingRes.ok) {
        const data = await packagingRes.json();
        // Filter for pallets that are done packaging and need QC sign
        setPackagingQcPallets(data.filter((p: Pallet) => p.status === 'packaging_done'));
      }
      
      // Officer checks final warehouse sign (which happens after packaging and warehouse receive)
      // For now, let's assume officer checks pallets in 'in_warehouse' status
      // But we need to fetch 'in_warehouse' pallets. 
      // Let's add a fetch for warehouse stock or just use the production pallets if they are updated.
      // Actually, the pallet status changes to 'in_warehouse' after packaging sends it.
      // So we should fetch all pallets or a specific status.
      // Let's fetch all pallets for officer to be safe, or add a specific endpoint.
      // For now, let's use the production pallets list, but we need to know if they are in warehouse.
      // The production pallets list might not have the latest status if they moved to packaging.
      // We should probably fetch all pallets for the officer.
      
      const allPalletsRes = await fetchWithAuth("/api/production/pallets?type=all");
      if (allPalletsRes.ok) {
        const allData = await allPalletsRes.json();
        setOfficerPallets(allData.filter((p: Pallet) => {
             // Logic for Officer: Needs to sign after Warehouse.
             // Warehouse signs the Packaging Certificate.
             // So we check packaging_certificate_data -> signatures -> warehouse -> signed
             // AND !quality_officer -> signed
             let pkgCertData: any = p.packaging_certificate_data;
             if (typeof pkgCertData === 'string') {
               try { pkgCertData = JSON.parse(pkgCertData); } catch (e) { pkgCertData = {}; }
             }
             return pkgCertData?.signatures?.warehouse?.signed && !pkgCertData?.signatures?.quality_officer?.signed;
        }));
      }

    } catch (err) {
      console.error("Failed to load pallets", err);
    }
  };

  const handleDetailsClick = (pallet: Pallet) => {
    setSelectedPallet(pallet);
    setShowDetailsModal(true);
  };

  const handleEditClick = (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
    }
    setEditFormData(certData);
    setEditingPallet(pallet);
    setShowEditModal(true);
  };

  const handleUpdatePallet = async () => {
    if (!editingPallet) return;

    try {
      let existingCertData: any = editingPallet.certificate_data;
      if (typeof existingCertData === 'string') {
        try { existingCertData = JSON.parse(existingCertData); } catch (e) { existingCertData = {}; }
      }

      const updatedCertData = {
        ...existingCertData,
        ...editFormData,
        signatures: existingCertData?.signatures // Preserve signatures
      };

      const res = await fetchWithAuth(`/api/production/pallets/${editingPallet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificate_data: updatedCertData,
          details: `${editFormData.item_name || ''} - ${editFormData.carton_count || ''} كرتونة`
        }),
      });

      if (!res.ok) throw new Error("فشل في تحديث الشهادة");

      loadPallets();
      setShowEditModal(false);
      setEditingPallet(null);
    } catch (err) {
      console.error("Failed to update pallet", err);
      console.error("فشل في تحديث الشهادة", err);
      setError("فشل في تحديث الشهادة. يرجى المحاولة مرة أخرى.");
    }
  };

  const handleSignClick = (pallet: Pallet, role: 'qc' | 'quality_officer', type: 'production' | 'packaging' = 'production') => {
    setPalletToSign({pallet, role, type});
    setShowSignModal(true);
  };

  const confirmSign = async () => {
    if (!palletToSign) return;
    const { pallet, role, type } = palletToSign;
    
    try {
      if (type === 'production') {
        let certData: any = pallet.certificate_data;
        if (typeof certData === 'string') {
          try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
        }
        
        const roleNames = {
          qc: "مراقب الجودة - قسم المختبر",
          quality_officer: "ضابط الجودة"
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
      } else {
        // Packaging Certificate Sign
        let certData: any = pallet.packaging_certificate_data;
        if (typeof certData === 'string') {
          try { certData = JSON.parse(certData); } catch (e) { certData = {}; }
        }

        const roleNames = {
          qc: "مراقب الجودة - قسم المختبر",
          quality_officer: "ضابط الجودة"
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

        if (role === 'qc') {
          // Use the packaging quality endpoint which updates status to packaging_qc_approved
          const res = await fetchWithAuth(`/api/packaging/quality/${pallet.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packaging_certificate_data: updatedCertData }),
          });
          if (!res.ok) throw new Error("فشل في توقيع شهادة التغليف");
        } else {
          // Quality Officer - just update the data, don't change status
          const res = await fetchWithAuth(`/api/production/pallets/${pallet.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packaging_certificate_data: updatedCertData }),
          });
          if (!res.ok) throw new Error("فشل في توقيع شهادة التغليف");
        }
      }

      loadPallets();
      setShowSignModal(false);
      setPalletToSign(null);
    } catch (err: any) {
      console.error("فشل في توقيع الشهادة", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">المختبر 🧪</h1>
          <p className="text-gray-500 mt-2">إدارة الجودة والتحاليل المخبرية</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('controller')}
          className={`pb-4 px-4 font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'controller' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          مراقب الجودة
        </button>
        <button
          onClick={() => setActiveTab('officer')}
          className={`pb-4 px-4 font-bold flex items-center gap-2 transition-colors ${
            activeTab === 'officer' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          ضابط الجودة
        </button>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]"
      >
        {activeTab === 'controller' ? (
          <div className="space-y-8">
            {/* Production Pallets Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                طبليات الإنتاج (بندورة/كاتشب) بانتظار توقيع الجودة
              </h2>
              <div className="grid gap-4">
                {qcPallets.map(pallet => (
                  <div key={pallet.id} className="flex items-center justify-between p-4 border rounded-xl bg-blue-50/30">
                    <div>
                      <div className="font-bold text-lg">{pallet.id}</div>
                      <div className="text-sm text-gray-500">{pallet.details}</div>
                      <div className="text-xs text-blue-600 mt-1">شهادة الإنتاج</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDetailsClick(pallet)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        تفاصيل
                      </button>
                      <button 
                        onClick={() => handleEditClick(pallet)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        تعديل
                      </button>
                      <button 
                        onClick={() => handleSignClick(pallet, 'qc', 'production')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 shadow-sm"
                      >
                        توقيع الجودة
                      </button>
                    </div>
                  </div>
                ))}
                {qcPallets.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                    لا توجد طبليات إنتاج بانتظار التوقيع
                  </div>
                )}
              </div>
            </div>

            {/* Packaging Pallets Section */}
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-purple-600" />
                طبليات التغليف بانتظار توقيع الجودة
              </h2>
              <div className="grid gap-4">
                {packagingQcPallets.map(pallet => (
                  <div key={pallet.id} className="flex items-center justify-between p-4 border rounded-xl bg-purple-50/30">
                    <div>
                      <div className="font-bold text-lg">{pallet.id}</div>
                      <div className="text-sm text-gray-500">{pallet.details}</div>
                      <div className="text-xs text-purple-600 mt-1">شهادة التغليف</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDetailsClick(pallet)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        تفاصيل
                      </button>
                      {/* Packaging cert edit might need a different modal or logic, skipping for now or reusing if generic */}
                      <button 
                        onClick={() => handleSignClick(pallet, 'qc', 'packaging')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-sm"
                      >
                        توقيع الجودة (تغليف)
                      </button>
                    </div>
                  </div>
                ))}
                {packagingQcPallets.length === 0 && (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                    لا توجد طبليات تغليف بانتظار التوقيع
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">طبليات بانتظار توقيع ضابط الجودة</h2>
            <div className="grid gap-4">
              {officerPallets.map(pallet => (
                <div key={pallet.id} className="flex items-center justify-between p-4 border rounded-xl">
                  <div>
                    <div className="font-bold">{pallet.id}</div>
                    <div className="text-sm text-gray-500">{pallet.details}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDetailsClick(pallet)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      تفاصيل
                    </button>
                    <button 
                      onClick={() => handleEditClick(pallet)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      تعديل
                    </button>
                    <button 
                      onClick={() => handleSignClick(pallet, 'quality_officer', 'packaging')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      توقيع ضابط الجودة
                    </button>
                  </div>
                </div>
              ))}
              {officerPallets.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  لا توجد طبليات بانتظار التوقيع
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Edit Modal */}
      {showEditModal && editingPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">تعديل الشهادة: {editingPallet.id}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">إغلاق</button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                <input 
                  type="text" 
                  value={editFormData.item_name || ''} 
                  onChange={e => setEditFormData({...editFormData, item_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وزن التعبئة</label>
                <input 
                  type="text" 
                  value={editFormData.filling_weight || ''} 
                  onChange={e => setEditFormData({...editFormData, filling_weight: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عدد الكراتين</label>
                <input 
                  type="number" 
                  value={editFormData.carton_count || ''} 
                  onChange={e => setEditFormData({...editFormData, carton_count: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الخلطة</label>
                <input 
                  type="text" 
                  value={editFormData.batch_number || ''} 
                  onChange={e => setEditFormData({...editFormData, batch_number: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <CustomDatePicker
                  label="تاريخ الإنتاج"
                  value={editFormData.production_date}
                  onChange={(date) => setEditFormData({...editFormData, production_date: date})}
                />
              </div>
              <div>
                <CustomDatePicker
                  label="تاريخ الانتهاء"
                  value={editFormData.expiry_date}
                  onChange={(date) => setEditFormData({...editFormData, expiry_date: date})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم شهادة المطابقة</label>
                <input 
                  type="text" 
                  value={editFormData.certificate_number || ''} 
                  onChange={e => setEditFormData({...editFormData, certificate_number: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">إلى مستودع</label>
                <input 
                  type="text" 
                  value={editFormData.warehouse_target || ''} 
                  onChange={e => setEditFormData({...editFormData, warehouse_target: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">الملاحظات</label>
                <textarea 
                  value={editFormData.notes || ''} 
                  onChange={e => setEditFormData({...editFormData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
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

      {/* Sign Confirmation Modal */}
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
                    {palletToSign.role === 'qc' ? 'مراقب الجودة - قسم المختبر' : 'ضابط الجودة'}
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

      {/* Details Modal */}
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
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
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
                  <>
                    {certData && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-4 border-b pb-2">شهادة الإنتاج</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-gray-500">التاريخ:</span> {certData.date}</div>
                          <div><span className="text-gray-500">القسم:</span> {certData.department}</div>
                          <div><span className="text-gray-500">اسم الصنف:</span> {certData.item_name}</div>
                          <div><span className="text-gray-500">وزن التعبئة:</span> {certData.filling_weight}</div>
                          <div><span className="text-gray-500">عدد الكراتين:</span> {certData.carton_count}</div>
                          <div><span className="text-gray-500">رقم الخلطة:</span> {certData.batch_number}</div>
                          <div><span className="text-gray-500">تاريخ الإنتاج:</span> {certData.production_date}</div>
                          <div><span className="text-gray-500">تاريخ الانتهاء:</span> {certData.expiry_date}</div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <h5 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-blue-600" />
                            سجل التوقيعات والاعتمادات
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { role: 'supervisor', label: 'المشرف', color: 'red' },
                              { role: 'qc', label: 'الجودة', color: 'blue' }
                            ].map(({ role, label, color }) => {
                              const val = certData.signatures?.[role];
                              const colorClasses: Record<string, any> = {
                                red: { bg: 'bg-red-50/50', border: 'border-red-200', text: 'text-red-900', icon: 'text-red-600' },
                                blue: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
                              };
                              const colors = colorClasses[color];

                              return (
                                <div key={role} className={`p-3 rounded-xl border transition-all ${
                                  val?.signed 
                                    ? `${colors.bg} ${colors.border}` 
                                    : "bg-gray-50 border-gray-200 border-dashed"
                                }`}>
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</div>
                                  {val?.signed ? (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
                                      <div className="flex flex-col">
                                        <span className={`text-sm font-serif italic ${colors.text}`}>{val.name}</span>
                                        <span className="text-[9px] text-gray-400">{new Date(val.date).toLocaleDateString('ar-EG')}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-300 italic">بانتظار التوقيع...</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {pkgCertData && (
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <h4 className="font-bold text-purple-900 mb-4 border-b border-purple-200 pb-2">شهادة التغليف</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><span className="text-gray-500">التاريخ:</span> {pkgCertData.date}</div>
                          <div><span className="text-gray-500">القسم:</span> {pkgCertData.department}</div>
                          <div><span className="text-gray-500">اسم الصنف:</span> {pkgCertData.item_name}</div>
                          <div><span className="text-gray-500">وزن التعبئة:</span> {pkgCertData.filling_weight}</div>
                          <div><span className="text-gray-500">عدد الكراتين:</span> {pkgCertData.carton_count}</div>
                          <div><span className="text-gray-500">رقم الخلطة:</span> {pkgCertData.batch_number}</div>
                          <div><span className="text-gray-500">تاريخ الإنتاج:</span> {pkgCertData.production_date}</div>
                          <div><span className="text-gray-500">تاريخ الانتهاء:</span> {pkgCertData.expiry_date}</div>
                          <div><span className="text-gray-500">رقم شهادة المطابقة:</span> {pkgCertData.certificate_number}</div>
                          <div><span className="text-gray-500">المستودع المستهدف:</span> {pkgCertData.warehouse_target}</div>
                          {pkgCertData.notes && (
                            <div className="col-span-2 mt-2 pt-2 border-t border-purple-100">
                              <span className="text-gray-500 block mb-1">ملاحظات:</span>
                              <p className="text-gray-700 bg-white p-2 rounded border border-purple-100">{pkgCertData.notes}</p>
                            </div>
                          )}
                        </div>
                        <div className="mt-6 pt-6 border-t border-purple-200">
                          <h5 className="font-bold text-sm text-purple-900 mb-4 flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-purple-600" />
                            سجل التوقيعات والاعتمادات
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { role: 'supervisor', label: 'مشرفة التغليف', color: 'purple' },
                              { role: 'qc', label: 'مراقب الجودة', color: 'blue' },
                              { role: 'warehouse', label: 'المستودع', color: 'emerald' },
                              { role: 'quality_officer', label: 'ضابط الجودة', color: 'indigo' }
                            ].map(({ role, label, color }) => {
                              const val = pkgCertData.signatures?.[role];
                              const colorClasses: Record<string, any> = {
                                purple: { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-900', icon: 'text-purple-600' },
                                blue: { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-900', icon: 'text-blue-600' },
                                emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-900', icon: 'text-emerald-600' },
                                indigo: { bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-900', icon: 'text-indigo-600' },
                              };
                              const colors = colorClasses[color];

                              return (
                                <div key={role} className={`p-3 rounded-xl border transition-all ${
                                  val?.signed 
                                    ? `${colors.bg} ${colors.border}` 
                                    : "bg-gray-50 border-gray-200 border-dashed"
                                }`}>
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</div>
                                  {val?.signed ? (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className={`w-4 h-4 ${colors.icon}`} />
                                      <div className="flex flex-col">
                                        <span className={`text-sm font-serif italic ${colors.text}`}>{val.name}</span>
                                        <span className="text-[9px] text-gray-400">{new Date(val.date).toLocaleDateString('ar-EG')}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-300 italic">بانتظار التوقيع...</span>
                                  )}
                                </div>
                              );
                            })}
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

export default Laboratory;
