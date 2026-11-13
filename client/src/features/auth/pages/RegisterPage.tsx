import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";

import AuthLayout from "../components/AuthLayout";
import { useAuthStore } from "../../../stores/auth.store";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function PasswordToggle({
  visible,
  onToggle,
  shouldReduceMotion,
}: {
  visible: boolean;
  onToggle: () => void;
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={shouldReduceMotion ? undefined : { scale: 1.12 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
      onClick={onToggle}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#17243D]"
      aria-label={visible ? "Hide password" : "Show password"}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={visible ? "hidden" : "visible"}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.7 }}
          className="block"
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function RegisterPage() {
  const navigate = useNavigate();

  const shouldReduceMotion = useReducedMotion();

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
      <motion.form
        onSubmit={handleSubmit}
        variants={shouldReduceMotion ? undefined : containerVariants}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        className="space-y-5"
      >

        {/* NAME */}
        <motion.div variants={shouldReduceMotion ? undefined : itemVariants}>
          <label className="mb-2 block text-sm font-semibold text-[#17243D]">
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
              className="w-full rounded-xl border border-gray-200 bg-[#FFFAF1] py-3 pl-12 pr-4 outline-none transition focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20"
            />
          </div>
        </motion.div>

        {/* EMAIL */}
        <motion.div variants={shouldReduceMotion ? undefined : itemVariants}>
          <label className="mb-2 block text-sm font-semibold text-[#17243D]">
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
              className="w-full rounded-xl border border-gray-200 bg-[#FFFAF1] py-3 pl-12 pr-4 outline-none transition focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20"
            />
          </div>
        </motion.div>

        {/* PASSWORD */}
        <motion.div variants={shouldReduceMotion ? undefined : itemVariants}>
          <label className="mb-2 block text-sm font-semibold text-[#17243D]">
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
              className="w-full rounded-xl border border-gray-200 bg-[#FFFAF1] py-3 pl-12 pr-12 outline-none transition focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20"
            />

            <PasswordToggle
              visible={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
              shouldReduceMotion={Boolean(shouldReduceMotion)}
            />
          </div>
        </motion.div>

        {/* CONFIRM PASSWORD */}
        <motion.div variants={shouldReduceMotion ? undefined : itemVariants}>
          <label className="mb-2 block text-sm font-semibold text-[#17243D]">
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
              className="w-full rounded-xl border border-gray-200 bg-[#FFFAF1] py-3 pl-12 pr-12 outline-none transition focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/20"
            />

            <PasswordToggle
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              shouldReduceMotion={Boolean(shouldReduceMotion)}
            />
          </div>
        </motion.div>

        {/* ERROR */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, y: -8, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? undefined
                  : { opacity: 0, y: -8 }
              }
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
              role="alert"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUBMIT */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={
            shouldReduceMotion || isSubmitting
              ? undefined
              : { y: -2, scale: 1.01 }
          }
          whileTap={
            shouldReduceMotion || isSubmitting
              ? undefined
              : { scale: 0.97 }
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F47768] py-3.5 font-semibold text-white shadow-lg shadow-[#F47768]/20 transition hover:bg-[#e96657] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isSubmitting ? (
              <motion.span
                key="submitting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Loader2
                  size={18}
                  className={shouldReduceMotion ? "" : "animate-spin"}
                />
                Creating account...
              </motion.span>
            ) : (
              <motion.span
                key="create"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                Create account
                <motion.span
                  animate={
                    shouldReduceMotion ? undefined : { x: [0, 4, 0] }
                  }
                  transition={{
                    duration: 1.5,
                    repeat: shouldReduceMotion ? 0 : Infinity,
                    repeatDelay: 1,
                  }}
                >
                  <ArrowRight size={19} />
                </motion.span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* LOGIN LINK */}
        <motion.p
          variants={shouldReduceMotion ? undefined : itemVariants}
          className="pt-2 text-center text-sm text-gray-500"
        >
          Already have an account?{" "}
          <motion.span
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            className="inline-block"
          >
            <Link
              to="/login"
              className="font-semibold text-[#F47768] hover:underline"
            >
              Sign in
            </Link>
          </motion.span>
        </motion.p>

      </motion.form>
    </AuthLayout>
  );
}

export default RegisterPage;