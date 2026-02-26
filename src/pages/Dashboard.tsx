import { useState, useEffect } from "react";
import { Users, ClipboardList, CalendarCheck, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { fetchWithAuth } from "../utils/api";

export default function Dashboard() {
  const [stats, setStats] = useState({
    workers: 0,
    tasks: 0,
    evaluationsToday: 0,
    averageScoreToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const [workersRes, tasksRes, evalsRes] = await Promise.all([
        fetchWithAuth("/api/workers"),
        fetchWithAuth("/api/tasks"),
        fetchWithAuth(`/api/evaluations?month=${today.substring(0, 7)}`)
      ]);

      const workers = await workersRes.json();
      const tasks = await tasksRes.json();
      const evals = await evalsRes.json();

      const todayEvals = evals.filter((e: any) => e.date === today);
      const avgScore = todayEvals.length > 0
        ? todayEvals.reduce((sum: number, e: any) => sum + e.total_score, 0) / todayEvals.length
        : 0;

      setStats({
        workers: workers.length,
        tasks: tasks.length,
        evaluationsToday: todayEvals.length,
        averageScoreToday: avgScore,
      });
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { name: "إجمالي العمال", value: stats.workers, icon: Users, color: "bg-durra-green", link: "/workers" },
    { name: "المهام المسجلة", value: stats.tasks, icon: ClipboardList, color: "bg-durra-green-light", link: "/tasks" },
    { name: "تقييمات اليوم", value: stats.evaluationsToday, icon: CalendarCheck, color: "bg-durra-red", link: "/evaluations" },
    { name: "متوسط تقييم اليوم", value: `${stats.averageScoreToday.toFixed(1)}%`, icon: TrendingUp, color: "bg-durra-red-light", link: "/reports" },
  ];

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <Logo className="scale-75 origin-left hidden sm:flex" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => (
            <Link
              key={stat.name}
              to={stat.link}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className={`${stat.color} p-4 rounded-xl text-white shadow-sm`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">مرحباً بك في نظام تقييم العمال</h2>
        <p className="text-gray-600 leading-relaxed max-w-3xl">
          هذا النظام يتيح لك إدارة العمال والمهام بسهولة، وتسجيل التقييمات اليومية بناءً على الأهداف المحددة لكل مهمة.
          يقوم النظام تلقائياً بحساب النسبة المئوية للإنجاز لكل عامل، ويوفر تقارير شهرية مفصلة.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            to="/evaluations/new"
            className="bg-durra-green text-white px-6 py-3 rounded-xl hover:bg-durra-green-light transition-colors font-medium shadow-sm"
          >
            إضافة تقييم جديد
          </Link>
          <Link
            to="/reports"
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            عرض التقارير
          </Link>
        </div>
      </div>
    </div>
  );
}
