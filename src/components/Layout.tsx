import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Users, ClipboardList, CalendarCheck, BarChart3, LayoutDashboard, LogOut, ShieldAlert } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigation = [
    { name: "الرئيسية", href: "/", icon: LayoutDashboard, permission: null },
    { name: "العمال", href: "/workers", icon: Users, permission: "manage_workers" },
    { name: "الأعمال (المهام)", href: "/tasks", icon: ClipboardList, permission: "manage_tasks" },
    { name: "التقييم اليومي", href: "/evaluations", icon: CalendarCheck, permission: "manage_evaluations" },
    { name: "التقرير الشهري", href: "/reports", icon: BarChart3, permission: "view_reports" },
    { name: "إدارة المستخدمين", href: "/admin/users", icon: ShieldAlert, permission: "manage_users" },
  ];

  const filteredNavigation = navigation.filter((item) => {
    if (!item.permission) return true;
    if (user?.role === "admin") return true;
    return user?.permissions.includes(item.permission);
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row" dir="rtl">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-durra-green text-white shadow-xl flex-shrink-0">
        <div className="p-6 flex flex-col items-center border-b border-white/10">
          <Logo className="mb-4 scale-90" />
          <h1 className="text-lg font-bold text-white text-center">شركة لافانت للمنتجات الغذائية</h1>
        </div>
        <nav className="mt-6 px-4 space-y-2 flex-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                  isActive
                    ? "bg-white text-durra-green shadow-md"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className={`ml-3 h-5 w-5 ${isActive ? "text-durra-green" : "text-white/70"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80">
            <span className="truncate">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-red-300 hover:text-red-100 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Watermark Logo */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 z-0 overflow-hidden">
          <Logo className="scale-[5] rotate-[-15deg]" />
        </div>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent p-6 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
