import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import { User, Lock, LogIn, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.status === "approved") {
      navigate("/");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        navigate("/");
      } else {
        setError(data.error || "فشل تسجيل الدخول");
      }
    } catch (err) {
      setError("حدث خطأ في الاتصال");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" dir="rtl">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-durra-green/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-durra-green-light/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Logo className="mx-auto scale-110 mb-4" />
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          تسجيل الدخول
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          مرحباً بك مجدداً في شركة لافانت للمنتجات الغذائية
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl py-10 px-6 shadow-2xl border-2 border-durra-green/20 rounded-3xl sm:px-12">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green sm:text-sm transition-all bg-gray-50 focus:bg-white outline-none"
                  placeholder="أدخل اسم المستخدم..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-12 pl-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-durra-green focus:border-durra-green sm:text-sm transition-all bg-gray-50 focus:bg-white outline-none"
                  placeholder="أدخل كلمة المرور..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-durra-green hover:bg-durra-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-durra-green transition-all transform hover:-translate-y-0.5"
              >
                <LogIn className="w-5 h-5" />
                دخول إلى النظام
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  ليس لديك حساب؟
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/signup"
                className="w-full flex justify-center py-3 px-4 border-2 border-durra-green rounded-xl shadow-sm text-sm font-bold text-durra-green bg-white hover:bg-durra-green/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-durra-green transition-all"
              >
                إنشاء حساب جديد
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
