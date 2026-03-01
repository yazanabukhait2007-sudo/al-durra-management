import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../utils/api";
import { Search, Filter, Clock, User, ShieldAlert, Activity } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import CustomSelect from "../components/CustomSelect";

interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  timestamp: string;
}

const ACTION_TRANSLATIONS: Record<string, string> = {
  "LOGIN": "تسجيل دخول",
  "SIGNUP": "إنشاء حساب",
  "UPDATE_PROFILE": "تحديث الملف الشخصي",
  "UPDATE_PASSWORD": "تحديث كلمة المرور",
  "UPDATE_PERMISSIONS": "تعديل صلاحيات",
  "DELETE_USER": "حذف مستخدم",
  "CREATE_WORKER": "إضافة عامل",
  "UPDATE_WORKER": "تعديل عامل",
  "DELETE_WORKER": "حذف عامل",
  "CREATE_TASK": "إضافة مهمة",
  "UPDATE_TASK": "تعديل مهمة",
  "DELETE_TASK": "حذف مهمة",
  "CREATE_EVALUATION": "إضافة تقييم",
  "UPDATE_EVALUATION": "تعديل تقييم",
  "DELETE_EVALUATION": "حذف تقييم",
  "CREATE_TRANSACTION": "إضافة حركة مالية",
  "DELETE_TRANSACTION": "حذف حركة مالية",
  "ADD_TRANSACTION": "إضافة حركة مالية",
};

const translateAction = (action: string) => ACTION_TRANSLATIONS[action] || action;

const ENTITY_TRANSLATIONS: Record<string, string> = {
  "user": "مستخدم",
  "worker": "عامل",
  "transaction": "حركة مالية",
  "task": "مهمة",
  "evaluation": "تقييم",
};

const translateEntity = (entity: string) => ENTITY_TRANSLATIONS[entity] || entity;

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/audit-logs");
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      (log.username?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.details?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.action.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = filterAction ? log.action === filterAction : true;

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map(log => log.action))) as string[];

  const getActionColor = (action: string) => {
    if (action.includes("DELETE")) return "text-red-600 bg-red-50 border-red-100";
    if (action.includes("CREATE") || action.includes("ADD")) return "text-green-600 bg-green-50 border-green-100";
    if (action.includes("UPDATE") || action.includes("EDIT")) return "text-blue-600 bg-blue-50 border-blue-100";
    return "text-gray-600 bg-gray-50 border-gray-100";
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-durra-green" />
            سجل النشاطات (Audit Logs)
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">تتبع جميع الإجراءات التي تمت في النظام</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="بحث في السجل (اسم المستخدم، التفاصيل...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-durra-green/20 focus:border-durra-green transition-all outline-none"
          />
        </div>
        <div className="relative min-w-[240px]">
          <CustomSelect
            value={filterAction}
            onChange={setFilterAction}
            options={[
              { value: "", label: "جميع الإجراءات" },
              ...uniqueActions.map(action => ({
                value: action,
                label: translateAction(action)
              }))
            ]}
            placeholder="جميع الإجراءات"
            icon={<Filter className="w-5 h-5 text-durra-green" />}
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">الوقت والتاريخ</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">المستخدم</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">الإجراء</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-durra-green border-t-transparent rounded-full animate-spin" />
                      <p>جاري تحميل السجل...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-3 opacity-60">
                      <ShieldAlert className="w-12 h-12 text-gray-400" />
                      <p>لا توجد سجلات مطابقة للبحث</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono" dir="ltr">
                      <div className="flex items-center gap-2 justify-end">
                        <span>{format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
                        <Clock className="w-4 h-4 opacity-40" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                          {log.username ? log.username.charAt(0).toUpperCase() : "?"}
                        </div>
                        {log.username || "النظام"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getActionColor(log.action)}`}>
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-md truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:break-words">
                      {log.details}
                      {log.entity_type && (
                        <span className="block text-xs text-gray-400 mt-1">
                          {translateEntity(log.entity_type)} #{log.entity_id}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
