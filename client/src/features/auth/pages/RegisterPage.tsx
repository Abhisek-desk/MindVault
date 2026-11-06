import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import AuthLayout from "../components/AuthLayout";
import { useAuthStore } from "../../../stores/auth.store";

function RegisterPage() {
  const navigate = useNavigate();

  const register = useAuthStore((state) => state.register);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (name.trim().length > 80) {
      setError("Name cannot exceed 80 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (email.trim().length > 254) {
      setError("Email address is too long.");
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setError("Password must contain between 8 and 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password
      });

      navigate("/dashboard", { replace: true });

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );

    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start building your personal knowledge library."
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* NAME */}
        <div>
          <label className="block text-sm font-semibold text-[#17243D] mb-2">
            Full name
          </label>

          <div className="relative">
            <User
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoComplete="name"
              maxLength={80}
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-[#FFFAF1] outline-none focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20 transition"
            />
          </div>
        </div>

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
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-[#FFFAF1] outline-none focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20 transition"
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
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              maxLength={72}
              required
              className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 bg-[#FFFAF1] outline-none focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20 transition"
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

        {/* CONFIRM PASSWORD */}
        <div>
          <label className="block text-sm font-semibold text-[#17243D] mb-2">
            Confirm password
          </label>

          <div className="relative">
            <Lock
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              maxLength={72}
              required
              className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-200 bg-[#FFFAF1] outline-none focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20 transition"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#17243D]"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
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
            "Creating account..."
          ) : (
            <>
              Create account
              <ArrowRight size={19} />
            </>
          )}
        </button>

        {/* LOGIN LINK */}
        <p className="text-center text-sm text-gray-500 pt-2">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#F47768] hover:underline"
          >
            Sign in
          </Link>
        </p>

      </form>
    </AuthLayout>
  );
}

export default RegisterPage;