import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  Menu,
  X,
  WifiOff,
  Search,
  FileText,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { useAuthStore } from "../../../stores/auth.store";

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  const getStartedLink = isAuthenticated
    ? "/dashboard"
    : "/register";

  const navigation = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Knowledge Packs", href: "#knowledge-packs" },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#FFFAF1] text-[#17243D]">

      {/* NAVIGATION */}
      <header className="relative z-50 border-b border-[#17243D]/10 bg-[#FFFAF1]/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">

          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17243D] text-[#F47768]">
              <BookOpen size={23} />
            </div>

            <span className="text-xl font-bold tracking-tight">
              Mind Vault
            </span>
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-[#596273] transition hover:text-[#B83E32]"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-5 md:flex">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="text-sm font-semibold hover:text-[#B83E32]"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold hover:text-[#B83E32]"
              >
                Sign in
              </Link>
            )}

            <Link
              to={getStartedLink}
              className="rounded-xl bg-[#17243D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263957]"
            >
              Get Started
              <ArrowRight className="ml-2 inline" size={16} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            className="rounded-lg p-2 hover:bg-[#17243D]/5 md:hidden"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* MOBILE NAVIGATION */}
        {menuOpen && (
          <div className="border-t border-[#17243D]/10 bg-[#FFFAF1] px-6 py-5 md:hidden">
            <div className="flex flex-col gap-5">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium text-[#596273]"
                >
                  {item.label}
                </a>
              ))}

              <Link
                to={isAuthenticated ? "/dashboard" : "/login"}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-semibold"
              >
                {isAuthenticated ? "Dashboard" : "Sign in"}
              </Link>

              <Link
                to={getStartedLink}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl bg-[#17243D] px-5 py-3 text-center text-sm font-semibold text-white"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">

          {/* HERO CONTENT */}
          <div className="relative z-10">

            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#F47768]/30 bg-[#F47768]/10 px-4 py-2">
              <Sparkles size={15} className="text-[#B83E32]" />

              <span className="text-xs font-bold tracking-wide text-[#B83E32]">
                YOUR PERSONAL KNOWLEDGE SPACE
              </span>
            </div>

            <h1 className="max-w-2xl text-5xl font-bold leading-[1.12] tracking-tight sm:text-6xl lg:text-7xl">
              Your Knowledge.
              <br />
              Your Memory.
              <br />

              <span className="text-[#B83E32]">
                Always Available.
              </span>
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-[#596273]">
              Capture your thoughts, organize what you learn,
              and build your personal knowledge library.
              Everything stays accessible, even when the
              internet disappears.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">

              <Link
                to={getStartedLink}
                className="inline-flex items-center justify-center rounded-xl bg-[#17243D] px-7 py-4 font-semibold text-white shadow-lg shadow-[#17243D]/15 transition hover:-translate-y-1 hover:bg-[#263957]"
              >
                Start Building Your Vault
                <ArrowRight className="ml-3" size={19} />
              </Link>

              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-[#17243D]/20 px-7 py-4 font-semibold transition hover:bg-[#17243D]/5"
              >
                Explore Features
              </a>

            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-[#596273]">

              <span className="flex items-center gap-2">
                <Check size={17} className="text-[#B83E32]" />
                Offline-first
              </span>

              <span className="flex items-center gap-2">
                <Check size={17} className="text-[#B83E32]" />
                Multilingual
              </span>

              <span className="flex items-center gap-2">
                <Check size={17} className="text-[#B83E32]" />
                Your own knowledge
              </span>

            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="relative mx-auto w-full max-w-xl">

            <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[#F47768]/20 blur-3xl" />

            <div className="absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-[#17243D]/10 blur-3xl" />

            <div className="relative rounded-3xl border border-[#17243D]/10 bg-white p-5 shadow-2xl shadow-[#17243D]/10 sm:p-7">

              {/* MOCKUP HEADER */}
              <div className="flex items-center justify-between border-b border-[#17243D]/10 pb-5">

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17243D] text-[#F47768]">
                    <BookOpen size={21} />
                  </div>

                  <div>
                    <p className="font-bold">My Knowledge Vault</p>
                    <p className="text-xs text-[#596273]">
                      Your personal workspace
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  <span className="text-xs font-semibold text-green-800">
                    Available offline
                  </span>
                </div>

              </div>

              {/* SEARCH */}
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#F8F1E5] px-4 py-3">
                <Search size={18} className="text-[#596273]" />

                <span className="text-sm text-[#596273]">
                  Search your knowledge...
                </span>
              </div>

              {/* STATS */}
              <div className="mt-6 grid grid-cols-2 gap-4">

                <div className="rounded-2xl bg-[#F8F1E5] p-5">
                  <FileText className="mb-4 text-[#B83E32]" size={22} />
                  <p className="text-2xl font-bold">128</p>
                  <p className="mt-1 text-xs text-[#596273]">
                    Saved Notes
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F8F1E5] p-5">
                  <BookOpen className="mb-4 text-[#B83E32]" size={22} />
                  <p className="text-2xl font-bold">05</p>
                  <p className="mt-1 text-xs text-[#596273]">
                    Knowledge Packs
                  </p>
                </div>

              </div>

              {/* RECENT NOTES */}
              <div className="mt-7">

                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold">Recently Saved</h3>

                  <span className="text-xs font-semibold text-[#B83E32]">
                    Your library
                  </span>
                </div>

                {[
                  "Understanding JavaScript",
                  "Data Structures & Algorithms",
                  "Web Development Notes",
                ].map((title, index) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 border-b border-[#17243D]/5 py-4 last:border-0"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F47768]/15 text-[#B83E32]">
                      <FileText size={19} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        {title}
                      </p>

                      <p className="mt-1 text-xs text-[#596273]">
                        {index + 1} day{index === 0 ? "" : "s"} ago
                      </p>
                    </div>
                  </div>
                ))}

              </div>

              {/* OFFLINE STATUS */}
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#17243D] p-4 text-white">
                <WifiOff size={19} className="text-[#F47768]" />

                <div>
                  <p className="text-sm font-semibold">
                    No internet? No problem.
                  </p>

                  <p className="mt-1 text-xs text-white/75">
                    Your downloaded knowledge stays with you.
                  </p>
                </div>

                <ShieldCheck className="ml-auto shrink-0 text-[#F47768]" size={22} />
              </div>

            </div>
          </div>

        </div>
      </section>

    </main>
  );
}

export default LandingPage;