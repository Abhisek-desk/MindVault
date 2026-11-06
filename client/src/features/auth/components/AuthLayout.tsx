import type { ReactNode } from "react";
import { motion } from "motion/react";
import { BookOpen, ShieldCheck, Cloud, WifiOff } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

function AuthLayout({
  children,
  title,
  subtitle
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F1E5] flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#17243D] p-14 flex-col justify-between text-white">

        <div className="flex items-center gap-3">
          <div className="bg-[#F47768] p-3 rounded-xl">
            <BookOpen size={25} />
          </div>

          <span className="text-2xl font-bold">
            Mind Vault
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-lg"
        >
          <h1 className="text-5xl font-bold leading-tight">
            Your knowledge.
            <br />
            Your memory.
            <br />
            Always available.
          </h1>

          <p className="text-gray-300 mt-6 text-lg leading-relaxed">
            Save your ideas, organize your knowledge,
            and access everything even when the
            internet is unavailable.
          </p>

          <div className="mt-10 space-y-5">

            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <WifiOff size={22} />
              </div>

              <span>Works offline, anytime</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <Cloud size={22} />
              </div>

              <span>Sync your knowledge across devices</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl">
                <ShieldCheck size={22} />
              </div>

              <span>Your personal knowledge stays protected</span>
            </div>

          </div>
        </motion.div>

        <p className="text-gray-400 text-sm">
          © 2026 Mind Vault. Your knowledge, your control.
        </p>

      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >

          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">

            <div className="bg-[#F47768] text-white p-3 rounded-xl">
              <BookOpen size={24} />
            </div>

            <span className="text-2xl font-bold text-[#17243D]">
              Mind Vault
            </span>

          </div>

          <h2 className="text-3xl font-bold text-[#17243D]">
            {title}
          </h2>

          <p className="text-gray-500 mt-2 mb-8">
            {subtitle}
          </p>

          {children}

        </motion.div>

      </div>

    </div>
  );
}

export default AuthLayout;