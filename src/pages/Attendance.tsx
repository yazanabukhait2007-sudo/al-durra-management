import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Calendar, Clock, UserCheck, UserX, AlertCircle, Save, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { fetchWithAuth } from "../utils/api";
import { AttendanceRecord, DepartureRecord, Worker } from "../types";
import Logo from "../components/Logo";
import ConfirmModal from "../components/ConfirmModal";

export default function Attendance() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] = useState<'attendance' | 'departures'>('attendance');
  const [loading, setLoading] = useState(true);
  
  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Departures State
  const [departures, setDepartures] = useState<DepartureRecord[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showDepartureModal, setShowDepartureModal] = useState(false);
  const [newDeparture, setNewDeparture] = useState({
    worker_id: "",
    type: "personal",
    start_time: format(new Date(), "HH:mm"),
    end_time: "",
    notes: ""
  });
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [newAttendance, setNewAttendance] = useState({
    worker_id: "",
    status: "present",
    check_in: format(new Date(), "HH:mm"),
    check_out: "",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const [deleteDepartureId, setDeleteDepartureId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch workers for the dropdown
    fetchWithAuth("/api/workers")
      .then(res => res.json())
      .then(data => setWorkers(data))
      .catch(err => console.error("Failed to fetch workers", err));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'attendance') {
        const res = await fetchWithAuth(`/api/attendance?date=${selectedDate}`);
        const data = await res.json();
        setAttendanceRecords(data);
      } else {
        const res = await fetchWithAuth(`/api/departures?date=${selectedDate}`);
        const data = await res.json();
        setDepartures(data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      showToast("فشل تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when tab changes
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleStatusChange = async (workerId: number, status: string) => {
    // Optimistic update
    setAttendanceRecords(prev => prev.map(rec => 
      rec.worker_id === workerId ? { ...rec, status: status as any } : rec
    ));

    try {
      const record = attendanceRecords.find(r => r.worker_id === workerId);
      await fetchWithAuth("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: workerId,
          date: selectedDate,
          status,
          check_in: record?.check_in,
          check_out: record?.check_out,
          notes: record?.notes
        })
      });
    } catch (error) {
      console.error("Failed to update status", error);
      showToast("فشل تحديث الحالة", "error");
      fetchData(); // Revert on error
    }
  };

  const handleTimeChange = (workerId: number, field: 'check_in' | 'check_out', value: string) => {
    setAttendanceRecords(prev => prev.map(rec => 
      rec.worker_id === workerId ? { ...rec, [field]: value } : rec
    ));
  };

  const handleNoteChange = (workerId: number, value: string) => {
    setAttendanceRecords(prev => prev.map(rec => 
      rec.worker_id === workerId ? { ...rec, notes: value } : rec
    ));
  };

  const saveAttendanceDetails = async (workerId: number) => {
    const record = attendanceRecords.find(r => r.worker_id === workerId);
    if (!record || !record.status) return;

    try {
      const res = await fetchWithAuth("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: workerId,
          date: selectedDate,
          status: record.status,
          check_in: record.check_in,
          check_out: record.check_out,
          notes: record.notes
        })
      });
      
      if (res.ok) {
        showToast("تم حفظ التفاصيل", "success");
      }
    } catch (error) {
      showToast("فشل الحفظ", "error");
    }
  };

  const handleAddDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeparture.worker_id || !newDeparture.start_time) return;

    try {
      const res = await fetchWithAuth("/api/departures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDeparture,
          date: selectedDate,
          worker_id: parseInt(newDeparture.worker_id)
        })
      });

      if (res.ok) {
        showToast("تم إضافة المغادرة بنجاح", "success");
        setShowDepartureModal(false);
        setNewDeparture({
          worker_id: "",
          type: "personal",
          start_time: format(new Date(), "HH:mm"),
          end_time: "",
          notes: ""
        });
        fetchData();
      }
    } catch (error) {
      showToast("فشل إضافة المغادرة", "error");
    }
  };

  const handleDeleteDeparture = async () => {
    if (!deleteDepartureId) return;
    try {
      const res = await fetchWithAuth(`/api/departures/${deleteDepartureId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("تم حذف المغادرة", "success");
        setDeleteDepartureId(null);
        fetchData();
      }
    } catch (error) {
      showToast("فشل حذف المغادرة", "error");
    }
  };

  const canManage = user?.role === 'admin' || user?.permissions.includes('manage_attendance');

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendance.worker_id || !newAttendance.status) return;

    try {
      const res = await fetchWithAuth("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAttendance,
          date: selectedDate,
          worker_id: parseInt(newAttendance.worker_id)
        })
      });

      if (res.ok) {
        showToast("تم تسجيل الحضور بنجاح", "success");
        setShowAttendanceModal(false);
        setNewAttendance({
          worker_id: "",
          status: "present",
          check_in: format(new Date(), "HH:mm"),
          check_out: "",
          notes: ""
        });
        fetchData();
      }
    } catch (error) {
      showToast("فشل تسجيل الحضور", "error");
    }
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-durra-green" />
            سجل الحضور والمغادرات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة دوام الموظفين والمغادرات اليومية</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none outline-none text-gray-700 dark:text-gray-200 font-medium"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-6 py-3 font-medium text-sm transition-all relative ${
            activeTab === 'attendance' 
              ? 'text-durra-green' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          سجل الحضور
          {activeTab === 'attendance' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-durra-green rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('departures')}
          className={`px-6 py-3 font-medium text-sm transition-all relative ${
            activeTab === 'departures' 
              ? 'text-durra-green' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          المغادرات
          {activeTab === 'departures' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-durra-green rounded-t-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-durra-green"></div>
          </div>
        ) : activeTab === 'attendance' ? (
          <div className="p-6">
            {canManage && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setShowAttendanceModal(true)}
                  className="bg-durra-green text-white px-6 py-2.5 rounded-xl hover:bg-durra-green-light transition-all shadow-md active:scale-95 font-bold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  تسجيل حضور جديد
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-1/4">الموظف</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-1/4">الحالة</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-1/6">وقت الحضور</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-1/6">وقت الانصراف</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300">ملاحظات</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-300 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {attendanceRecords.map((record) => (
                  <tr key={record.worker_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {record.worker_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {[
                          { value: 'present', label: 'حاضر', color: 'bg-green-100 text-green-700 border-green-200' },
                          { value: 'absent', label: 'غائب', color: 'bg-red-100 text-red-700 border-red-200' },
                          { value: 'vacation', label: 'إجازة', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                          { value: 'sick', label: 'مرضي', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => canManage && handleStatusChange(record.worker_id, option.value)}
                            disabled={!canManage}
                            className={`
                              px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                              ${record.status === option.value 
                                ? option.color + ' shadow-sm scale-105' 
                                : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-400'
                              }
                            `}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="time"
                        value={record.check_in || ''}
                        onChange={(e) => handleTimeChange(record.worker_id, 'check_in', e.target.value)}
                        disabled={!canManage || !record.status || record.status === 'absent'}
                        className="w-full bg-transparent border-b border-gray-200 dark:border-gray-600 focus:border-durra-green outline-none py-1 text-sm disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="time"
                        value={record.check_out || ''}
                        onChange={(e) => handleTimeChange(record.worker_id, 'check_out', e.target.value)}
                        disabled={!canManage || !record.status || record.status === 'absent'}
                        className="w-full bg-transparent border-b border-gray-200 dark:border-gray-600 focus:border-durra-green outline-none py-1 text-sm disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={record.notes || ''}
                        onChange={(e) => handleNoteChange(record.worker_id, e.target.value)}
                        placeholder="ملاحظات..."
                        disabled={!canManage}
                        className="w-full bg-transparent border-b border-gray-200 dark:border-gray-600 focus:border-durra-green outline-none py-1 text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {canManage && (record.check_in !== undefined || record.check_out !== undefined || record.notes !== undefined) && (
                        <button
                          onClick={() => saveAttendanceDetails(record.worker_id)}
                          className="text-durra-green hover:bg-durra-green/10 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="حفظ التفاصيل"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : (
          <div className="p-6">
            {canManage && (
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setShowDepartureModal(true)}
                  className="bg-durra-green text-white px-6 py-2.5 rounded-xl hover:bg-durra-green-light transition-all shadow-md active:scale-95 font-bold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  تسجيل مغادرة جديدة
                </button>
              </div>
            )}

            {departures.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <UserX className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد مغادرات مسجلة لهذا اليوم</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departures.map((dep) => (
                  <div key={dep.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 relative group hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{dep.worker_name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                          dep.type === 'personal' ? 'bg-orange-100 text-orange-700' :
                          dep.type === 'work' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {dep.type === 'personal' ? 'مغادرة شخصية' : dep.type === 'work' ? 'مهمة عمل' : 'خروج مبكر'}
                        </span>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => setDeleteDepartureId(dep.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">من:</span>
                        <span className="font-mono bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">{dep.start_time}</span>
                      </div>
                      {dep.end_time && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">إلى:</span>
                          <span className="font-mono bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">{dep.end_time}</span>
                        </div>
                      )}
                    </div>

                    {dep.notes && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-600">
                        {dep.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">تسجيل حضور جديد</h3>
                <button 
                  onClick={() => setShowAttendanceModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddAttendance} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">الموظف</label>
                  <select
                    value={newAttendance.worker_id}
                    onChange={(e) => setNewAttendance({...newAttendance, worker_id: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                    required
                  >
                    <option value="">اختر الموظف...</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">الحالة</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'present', label: 'حاضر' },
                      { value: 'absent', label: 'غائب' },
                      { value: 'vacation', label: 'إجازة' },
                      { value: 'sick', label: 'مرضي' },
                    ].map(status => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setNewAttendance({...newAttendance, status: status.value})}
                        className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                          newAttendance.status === status.value
                            ? 'bg-durra-green text-white border-durra-green'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">وقت الحضور</label>
                    <input
                      type="time"
                      value={newAttendance.check_in}
                      onChange={(e) => setNewAttendance({...newAttendance, check_in: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                      disabled={newAttendance.status === 'absent'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">وقت الانصراف</label>
                    <input
                      type="time"
                      value={newAttendance.check_out}
                      onChange={(e) => setNewAttendance({...newAttendance, check_out: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                      disabled={newAttendance.status === 'absent'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                  <textarea
                    value={newAttendance.notes}
                    onChange={(e) => setNewAttendance({...newAttendance, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none h-24 resize-none"
                    placeholder="ملاحظات إضافية..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-durra-green text-white px-6 py-2.5 rounded-xl hover:bg-durra-green-light transition-all shadow-md active:scale-95 font-bold"
                  >
                    حفظ السجل
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAttendanceModal(false)}
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Departure Modal */}
      {showDepartureModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">تسجيل مغادرة جديدة</h3>
                <button 
                  onClick={() => setShowDepartureModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddDeparture} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">الموظف</label>
                  <select
                    value={newDeparture.worker_id}
                    onChange={(e) => setNewDeparture({...newDeparture, worker_id: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                    required
                  >
                    <option value="">اختر الموظف...</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">نوع المغادرة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'personal', label: 'شخصية' },
                      { value: 'work', label: 'عمل' },
                      { value: 'early', label: 'خروج مبكر' },
                    ].map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setNewDeparture({...newDeparture, type: type.value})}
                        className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                          newDeparture.type === type.value
                            ? 'bg-durra-green text-white border-durra-green'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">وقت الخروج</label>
                    <input
                      type="time"
                      value={newDeparture.start_time}
                      onChange={(e) => setNewDeparture({...newDeparture, start_time: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">وقت العودة (اختياري)</label>
                    <input
                      type="time"
                      value={newDeparture.end_time}
                      onChange={(e) => setNewDeparture({...newDeparture, end_time: e.target.value})}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ملاحظات</label>
                  <textarea
                    value={newDeparture.notes}
                    onChange={(e) => setNewDeparture({...newDeparture, notes: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green outline-none h-24 resize-none"
                    placeholder="سبب المغادرة..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-durra-green text-white px-6 py-2.5 rounded-xl hover:bg-durra-green-light transition-all shadow-md active:scale-95 font-bold"
                  >
                    حفظ المغادرة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDepartureModal(false)}
                    className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteDepartureId}
        title="حذف مغادرة"
        message="هل أنت متأكد من حذف سجل المغادرة هذا؟"
        confirmText="نعم، احذف"
        onConfirm={handleDeleteDeparture}
        onCancel={() => setDeleteDepartureId(null)}
      />
    </div>
  );
}
