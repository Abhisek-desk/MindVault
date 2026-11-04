import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Home, SearchX } from "lucide-react";

function NotFound() {
  return (
    <div className="min-h-screen bg-[#17243D] flex items-center justify-center p-5">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-[#FFFAF1] max-w-lg w-full rounded-3xl p-10 text-center"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="flex justify-center text-[#F47768]"
        >
          <SearchX size={65} />
        </motion.div>

        <h1 className="text-8xl font-bold text-[#F47768] mt-5">404</h1>

        <h2 className="text-2xl font-bold text-[#17243D] mt-4">
          Page Not Found
        </h2>

        <p className="text-[#85858A] mt-4 leading-7">
          Looks like this page has gone missing. Don't worry, your knowledge is
          still safe in Mind Vault.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-7 px-6 py-3 rounded-xl bg-[#F47768] text-white font-semibold hover:opacity-90 transition"
        >
          <Home size={18} />
          Back to Home
        </Link>

        <p className="text-xs text-[#85858A] mt-10 tracking-widest">
          MIND VAULT
        </p>
      </motion.div>
    </div>
  );
}

export default NotFound;
