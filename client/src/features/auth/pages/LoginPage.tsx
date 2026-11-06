import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import AuthLayout from "../components/AuthLayout";
import { useAuthStore } from "../../../stores/auth.store";

function LoginPage() {
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length === 0 || password.length > 72) {
      setError("Please enter a valid password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password
      });

      navigate("/dashboard", { replace: true });

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please try again."
      );

    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your personal knowledge library."
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* EMAIL */}
        <div>
          <label className="block text-sm font-semibold text-[#17243D] mb-2">
            Email address
          </label>

          <div className="relative">
            <Mail
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={254}
              required
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-[#FFFAF1] outline-none focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20 transition"
            />
          </div>
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block text-sm font-semibold text-[#17243D] mb-2">
            Password
          </label>

          <div className="relative">
            <Lock
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              maxLength={72}
              required
              className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-gray-200 bg-[#FFFAF1] outline-none focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20 transition"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#17243D]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm"
            role="alert"
          >
            {error}
          </motion.div>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-[#F47768] hover:bg-[#e96657] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition shadow-lg shadow-[#F47768]/20"
        >
          {isSubmitting ? (
            "Signing in..."
          ) : (
            <>
              Sign in
              <ArrowRight size={19} />
            </>
          )}
        </button>

        {/* REGISTER LINK */}
        <p className="text-center text-sm text-gray-500 pt-2">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-[#F47768] hover:underline"
          >
            Create account
          </Link>
        </p>

      </form>
    </AuthLayout>
  );
}

export default LoginPage;