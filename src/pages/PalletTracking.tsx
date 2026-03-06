import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Filter, Package, CheckCircle, Clock, Truck, FileText, AlertCircle, ChevronDown } from "lucide-react";
import { fetchWithAuth } from "../utils/api";

interface Pallet {
  id: string;
  type: string;
  details: string;
  status: string;
  created_at: string;
  certificate_data?: string | object;
  packaging_certificate_data?: string | object;
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
    [key: string]: { signed: boolean; date: string; name: string } | undefined;
  };
}

const PalletTracking = () => {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadPallets();
  }, []);

  const loadPallets = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/api/production/pallets?type=all");
      if (res.ok) {
        const data = await res.json();
        setPallets(data);
      } else {
        setError("فشل في تحميل بيانات الطبالي");
      }
    } catch (err) {
      setError("حدث خطأ أثناء تحميل البيانات");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const departmentOptions = [
    { value: "all", label: "جميع الأقسام" },
    { value: "tomato", label: "قسم البندورة" },
    { value: "ketchup", label: "قسم الكاتشب" },
  ];

  const statusOptions = [
    { value: "all", label: "جميع الحالات" },
    { value: "produced", label: "تم الإنتاج" },
    { value: "in_packaging_stock", label: "في مخزون التغليف" },
    { value: "packaging_in_progress", label: "قيد التغليف" },
    { value: "packaging_done", label: "تم التغليف" },
    { value: "in_warehouse", label: "في المستودع" },
  ];

  const filteredPallets = pallets.filter(pallet => {
    const matchesSearch = 
      pallet.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pallet.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || pallet.type === filterType;
    const matchesStatus = filterStatus === "all" || pallet.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'produced':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">تم الإنتاج</span>;
      case 'in_packaging_stock':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">في مخزون التغليف</span>;
      case 'packaging_in_progress':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">قيد التغليف</span>;
      case 'packaging_done':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">تم التغليف</span>;
      case 'packaging_qc_approved':
        return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">جودة التغليف موافق عليها</span>;
      case 'in_warehouse':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">في المستودع</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'tomato': return 'بندورة';
      case 'ketchup': return 'كاتشب';
      default: return type;
    }
  };

  const handleShowDetails = (pallet: Pallet) => {
    let certData: any = pallet.certificate_data;
    if (typeof certData === 'string') {
      try {
        certData = JSON.parse(certData);
      } catch (e) {
        certData = {};
      }
    }
    
    let pkgCertData: any = pallet.packaging_certificate_data;
    if (typeof pkgCertData === 'string') {
      try {
        pkgCertData = JSON.parse(pkgCertData);
      } catch (e) {
        pkgCertData = null;
      }
    }

    setSelectedPallet({ ...pallet, certificate_data: certData, packaging_certificate_data: pkgCertData });
    setShowDetailsModal(true);
  };

  const renderCertificateDetails = (cert: any, title: string, bgColor: string, borderColor: string) => {
    if (!cert) return null;
    return (
      <div className={`${bgColor} rounded-xl p-6 border ${borderColor} mb-6`}>
        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-500" />
          {title}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">القسم:</span>
            <span className="font-medium">{cert.department}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">الصنف:</span>
            <span className="font-medium">{cert.item_name}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">الوزن:</span>
            <span className="font-medium">{cert.filling_weight}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">عدد الكراتين:</span>
            <span className="font-medium">{cert.carton_count}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">رقم الخلطة:</span>
            <span className="font-medium">{cert.batch_number}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">تاريخ الإنتاج:</span>
            <span className="font-medium">{cert.production_date}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">تاريخ الانتهاء:</span>
            <span className="font-medium">{cert.expiry_date}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">رقم شهادة المطابقة:</span>
            <span className="font-medium">{cert.certificate_number}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-500">المستودع المستهدف:</span>
            <span className="font-medium">{cert.warehouse_target}</span>
          </div>
          {cert.notes && (
            <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t border-gray-100">
              <span className="text-gray-500 block mb-1">ملاحظات:</span>
              <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{cert.notes}</p>
            </div>
          )}
        </div>

        {/* Signatures for this cert */}
        <div className="mt-6 pt-4 border-t border-gray-200/50">
           <h5 className="font-bold text-sm text-gray-700 mb-3">التوقيعات</h5>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {Object.entries(cert.signatures || {}).map(([key, val]: [string, any]) => (
               <div key={key} className={`p-3 rounded-lg border text-sm ${val?.signed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 border-dashed'}`}>
                 <div className="font-medium mb-1">
                    {key === 'supervisor' ? 'المشرف' : 
                     key === 'qc' ? 'مراقب الجودة' : 
                     key === 'warehouse' ? 'المستودع' : 
                     key === 'quality_officer' ? 'ضابط الجودة' : key}
                 </div>
                 {val?.signed ? (
                   <div className="text-green-700 flex items-center gap-1">
                     <CheckCircle className="w-3 h-3" />
                     <span>{val.name}</span>
                     <span className="text-xs opacity-75">({new Date(val.date).toLocaleDateString('ar-EG')})</span>
                   </div>
                 ) : (
                   <div className="text-gray-400 italic">بانتظار التوقيع</div>
                 )}
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">تتبع الطبالي 📦</h1>
          <p className="text-gray-500 mt-2">متابعة حركة الطبالي من الإنتاج إلى المستودع</p>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث برقم الطبلية أو التفاصيل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Department Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 min-w-[160px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span>{departmentOptions.find(opt => opt.value === filterType)?.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showTypeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTypeDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                  >
                    {departmentOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilterType(option.value);
                          setShowTypeDropdown(false);
                        }}
                        className={`w-full text-right px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 flex items-center justify-between ${
                          filterType === option.value ? 'text-blue-600 bg-blue-50/50 font-semibold' : 'text-gray-600'
                        }`}
                      >
                        {option.label}
                        {filterType === option.value && <CheckCircle className="w-4 h-4" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowTypeDropdown(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{statusOptions.find(opt => opt.value === filterStatus)?.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                  >
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilterStatus(option.value);
                          setShowStatusDropdown(false);
                        }}
                        className={`w-full text-right px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 flex items-center justify-between ${
                          filterStatus === option.value ? 'text-blue-600 bg-blue-50/50 font-semibold' : 'text-gray-600'
                        }`}
                      >
                        {option.label}
                        {filterStatus === option.value && <CheckCircle className="w-4 h-4" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">رقم الطبلية</th>
                <th className="px-6 py-4 font-medium">القسم</th>
                <th className="px-6 py-4 font-medium">التفاصيل</th>
                <th className="px-6 py-4 font-medium">تاريخ الإنتاج</th>
                <th className="px-6 py-4 font-medium">الحالة</th>
                <th className="px-6 py-4 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td>
                </tr>
              ) : filteredPallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">لا توجد طبالي مطابقة للبحث</td>
                </tr>
              ) : (
                filteredPallets.map((pallet) => (
                  <tr key={pallet.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">{pallet.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        pallet.type === 'tomato' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {getTypeLabel(pallet.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{pallet.details}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(pallet.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(pallet.status)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleShowDetails(pallet)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        التفاصيل
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gray-50 p-6 border-b flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">تفاصيل الطبلية: {selectedPallet.id}</h3>
                <p className="text-sm text-gray-500 mt-1">تاريخ الإنشاء: {new Date(selectedPallet.created_at).toLocaleString('ar-EG')}</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Status Timeline */}
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -z-10"></div>
                
                {[
                  { status: 'produced', label: 'تم الإنتاج', icon: Package },
                  { status: 'in_packaging', label: 'التغليف', icon: Box },
                  { status: 'in_warehouse', label: 'المستودع', icon: Truck }
                ].map((step, idx) => {
                  const isActive = 
                    (selectedPallet.status === 'produced' && idx === 0) ||
                    (selectedPallet.status.includes('packaging') && idx <= 1) ||
                    (selectedPallet.status === 'in_warehouse' && idx <= 2);
                  
                  return (
                    <div key={step.status} className="flex flex-col items-center gap-2 bg-white px-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-300'
                      }`}>
                        <step.icon className="w-5 h-5" />
                      </div>
                      <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Certificates */}
              {renderCertificateDetails(selectedPallet.certificate_data, "شهادة الإنتاج (بندورة/كاتشب)", "bg-gray-50", "border-gray-100")}
              
              {selectedPallet.packaging_certificate_data && 
                renderCertificateDetails(selectedPallet.packaging_certificate_data, "شهادة التغليف", "bg-purple-50", "border-purple-100")
              }
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
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

// Helper component for timeline icon
const Box = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

export default PalletTracking;
