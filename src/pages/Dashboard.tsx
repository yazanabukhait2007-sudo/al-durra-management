/**
 * لوحة التحكم الرئيسية: عرض الإحصائيات العامة والرسوم البيانية للأداء
 */

import { useState, useEffect } from "react";
import { Users, ClipboardList, CalendarCheck, TrendingUp, Activity, ArrowUpRight, Plus, FileText } from "lucide-react";
import { format, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from "motion/react";
import Logo from "../components/Logo";
import { fetchWithAuth } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { DailyEvaluation } from "../types";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    workers: 0,
    tasks: 0,
    evaluationsToday: 0,
    averageScoreToday: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentEvaluations, setRecentEvaluations] = useState<DailyEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");
      const currentMonthStr = format(today, "yyyy-MM");
      
      const [workersRes, tasksRes, evalsRes] = await Promise.all([
        fetchWithAuth("/api/workers"),
        fetchWithAuth("/api/tasks"),
        fetchWithAuth(`/api/evaluations?month=${currentMonthStr}`)
      ]);

      const workers = workersRes.ok ? await workersRes.json() : [];
      const tasks = tasksRes.ok ? await tasksRes.json() : [];
      const evals: DailyEvaluation[] = evalsRes.ok ? await evalsRes.json() : [];

      // Calculate stats
      const todayEvals = evals.filter((e) => e.date === todayStr);
      const avgScore = todayEvals.length > 0
        ? todayEvals.reduce((sum, e) => sum + e.total_score, 0) / todayEvals.length
        : 0;

      setStats({
        workers: workers.length || 0,
        tasks: tasks.length || 0,
        evaluationsToday: todayEvals.length || 0,
        averageScoreToday: avgScore || 0,
      });

      // Prepare Chart Data (Last 7 days or current month progress)
      // Let's show the current month's daily average
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      const daysInMonth = eachDayOfInterval({ start, end });

      const data = daysInMonth.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayEvals = evals.filter(e => e.date === dateStr);
        const dayAvg = dayEvals.length > 0
          ? dayEvals.reduce((sum, e) => sum + e.total_score, 0) / dayEvals.length
          : 0;
        
        return {
          date: format(day, "d MMM", { locale: arSA }),
          fullDate: dateStr,
          score: Math.round(dayAvg),
          count: dayEvals.length
        };
      }).filter(d => d.fullDate <= todayStr); // Only show up to today

      setChartData(data);

      // Recent Evaluations
      const sortedEvals = [...evals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentEvaluations(sortedEvals.slice(0, 5));

    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoading(false);
    }
  };

  const canAddEvaluation = user?.role === 'admin' || user?.permissions.includes('add_evaluation');
  const canViewReports = user?.role === 'admin' || user?.permissions.includes('view_reports');

  const statCards = [
    { 
      name: "إجمالي العمال", 
      value: stats.workers, 
      icon: Users, 
      color: "text-blue-600 dark:text-blue-400", 
      bg: "bg-blue-50 dark:bg-blue-900/20",
      link: "/workers" 
    },
    { 
      name: "المهام المسجلة", 
      value: stats.tasks, 
      icon: ClipboardList, 
      color: "text-purple-600 dark:text-purple-400", 
      bg: "bg-purple-50 dark:bg-purple-900/20",
      link: "/tasks" 
    },
    { 
      name: "تقييمات اليوم", 
      value: stats.evaluationsToday, 
      icon: CalendarCheck, 
      color: "text-emerald-600 dark:text-emerald-400", 
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      link: "/evaluations" 
    },
    { 
      name: "متوسط الأداء اليومي", 
      value: `${stats.averageScoreToday.toFixed(1)}%`, 
      icon: TrendingUp, 
      color: "text-amber-600 dark:text-amber-400", 
      bg: "bg-amber-50 dark:bg-amber-900/20",
      link: "/monthly-report" 
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-12 transition-colors duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">لوحة التحكم</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">مرحباً بك، {user?.username} 👋</p>
        </div>
        <div className="flex gap-3">
          {canAddEvaluation && (
            <Link
              to="/evaluations/new"
              className="flex items-center gap-2 bg-durra-green text-white px-4 py-2 rounded-lg hover:bg-durra-green-light transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة تقييم</span>
            </Link>
          )}
          {canViewReports && (
            <Link
              to="/monthly-report"
              className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <FileText className="w-5 h-5" />
              <span>تقرير شهري</span>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <motion.div key={stat.name} variants={itemVariants}>
                <Link
                  to={stat.link}
                  className="block bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{stat.name}</p>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {stat.value}
                      </h3>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-200`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <span>عرض التفاصيل</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">أداء العمال هذا الشهر</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">متوسط درجات التقييم اليومية</p>
                </div>
                <Activity className="w-5 h-5 text-gray-400" />
              </div>
              <div className="h-[300px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      dy={10}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      domain={[0, 'auto']}
                      unit="%"
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value}%`, 'الأداء']}
                      labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      name="الأداء"
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorScore)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Recent Activity Section */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">أحدث التقييمات</h2>
                <Link to="/evaluations" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                  عرض الكل
                </Link>
              </div>
              <div className="space-y-4">
                {recentEvaluations.length > 0 ? (
                  recentEvaluations.map((evalItem) => (
                    <div key={evalItem.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                        ${evalItem.total_score >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          evalItem.total_score >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {Math.round(evalItem.total_score)}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{evalItem.worker_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{format(parseISO(evalItem.date), "d MMMM yyyy", { locale: arSA })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    لا توجد تقييمات حديثة
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-1">نصيحة اليوم</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                    متابعة الأداء اليومي تساعد في تحسين الإنتاجية. حاول الحفاظ على التقييمات فوق 60% للحصول على أفضل النتائج.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
