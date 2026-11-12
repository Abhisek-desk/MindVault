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
  Download,
  Languages,
  RefreshCw,
  BrainCircuit,
  FolderOpen,
  Cloud,
} from "lucide-react";

import { useAuthStore } from "../../../stores/auth.store";
import PageMetadata from "../../../components/common/PageMetadata";

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const getStartedLink = isAuthenticated ? "/dashboard" : "/register";

  const navigation = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Knowledge Packs", href: "#knowledge-packs" },
  ];

  const features = [
    {
      icon: WifiOff,
      title: "Works Offline",
      description:
        "Access your saved notes and downloaded knowledge packs even without an internet connection.",
    },
    {
      icon: Languages,
      title: "Multilingual Knowledge",
      description:
        "Organize and explore knowledge across multiple languages with multilingual search support.",
    },
    {
      icon: Search,
      title: "Powerful Search",
      description:
        "Find your saved notes and downloaded learning materials using fast local search.",
    },
    {
      icon: RefreshCw,
      title: "Smart Synchronization",
      description:
        "Synchronize your changes when you're back online, with conflict protection for your data.",
    },
    {
      icon: BrainCircuit,
      title: "AI Knowledge Assistant",
      description:
        "Get AI-assisted answers using your knowledge and relevant saved information when online.",
    },
    {
      icon: ShieldCheck,
      title: "Your Personal Space",
      description:
        "Keep your notes and learning materials organized in your own personal knowledge workspace.",
    },
  ];

  const steps = [
    {
      number: "01",
      icon: FileText,
      title: "Capture Your Knowledge",
      description:
        "Create notes, organize your thoughts, and save the information you want to remember.",
    },
    {
      number: "02",
      icon: Download,
      title: "Download Knowledge Packs",
      description:
        "Choose learning resources and download them to access useful information offline.",
    },
    {
      number: "03",
      icon: WifiOff,
      title: "Learn Anywhere",
      description:
        "Read your notes and downloaded materials without depending on a continuous internet connection.",
    },
    {
      number: "04",
      icon: Cloud,
      title: "Sync When Online",
      description:
        "Reconnect to the internet and synchronize your latest changes with your account.",
    },
  ];

  const packs = [
    {
      title: "Web Development",
      description:
        "Explore essential web technologies and development concepts.",
      icon: BookOpen,
      label: "Web Technologies",
    },
    {
      title: "JavaScript",
      description:
        "Learn JavaScript fundamentals, concepts, and practical topics.",
      icon: FileText,
      label: "Programming",
    },
    {
      title: "Python",
      description:
        "Explore Python programming concepts and useful learning materials.",
      icon: BrainCircuit,
      label: "Programming",
    },
    {
      title: "Data Structures & Algorithms",
      description:
        "Understand essential data structures and algorithmic concepts.",
      icon: FolderOpen,
      label: "Computer Science",
    },
    {
      title: "Computer Science",
      description:
        "Build your understanding of important computer science topics.",
      icon: BookOpen,
      label: "Fundamentals",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#FFFAF1] text-[#17243D]">
      <PageMetadata
        title="Mind Vault - Your Knowledge, Always Available"
        description="Mind Vault is your offline-first personal knowledge platform. Organize notes, explore downloadable knowledge packs, search your knowledge, and learn anywhere."
        robots="index, follow"
      />

      {/* NAVIGATION */}
      <header className="relative z-50 border-b border-[#17243D]/10 bg-[#FFFAF1]/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17243D] text-[#F47768]">
              <BookOpen size={23} />
            </div>

            <span className="text-xl font-bold tracking-tight">Mind Vault</span>
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
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="text-sm font-semibold hover:text-[#B83E32]"
            >
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>

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
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
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
              <span className="text-[#B83E32]">Always Available.</span>
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-[#596273]">
              Capture your thoughts, organize what you learn, and build your
              personal knowledge library. Everything stays accessible, even when
              the internet disappears.
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

              <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#F8F1E5] px-4 py-3">
                <Search size={18} className="text-[#596273]" />

                <span className="text-sm text-[#596273]">
                  Search your knowledge...
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-[#F8F1E5] p-5">
                  <FileText className="mb-4 text-[#B83E32]" size={22} />
                  <p className="text-2xl font-bold">128</p>
                  <p className="mt-1 text-xs text-[#596273]">Saved Notes</p>
                </div>

                <div className="rounded-2xl bg-[#F8F1E5] p-5">
                  <BookOpen className="mb-4 text-[#B83E32]" size={22} />
                  <p className="text-2xl font-bold">05</p>
                  <p className="mt-1 text-xs text-[#596273]">Knowledge Packs</p>
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-bold">Recently Saved</p>

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
                      <p className="text-sm font-semibold">{title}</p>

                      <p className="mt-1 text-xs text-[#596273]">
                        {index + 1} day{index === 0 ? "" : "s"} ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>

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

                <ShieldCheck
                  className="ml-auto shrink-0 text-[#F47768]"
                  size={22}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="scroll-mt-10 bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-[#B83E32]">
              Everything in one place
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              A smarter way to manage your knowledge.
            </h2>

            <p className="mt-5 leading-7 text-[#596273]">
              More than a note-taking application. Mind Vault helps you collect,
              organize, discover, and access your knowledge wherever you are.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#17243D]/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F47768]/15 text-[#B83E32]">
                    <Icon size={23} />
                  </div>

                  <h3 className="mt-6 text-lg font-bold">{feature.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-[#596273]">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-10 bg-[#F8F1E5] py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-[#B83E32]">
              Simple by design
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Your knowledge. Four simple steps.
            </h2>

            <p className="mt-5 leading-7 text-[#596273]">
              Build your personal knowledge library and take it with you, even
              when you go offline.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article key={step.number} className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-bold text-[#B83E32]">
                      {step.number}
                    </span>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#B83E32] shadow-sm">
                      <Icon size={23} />
                    </div>
                  </div>

                  <h3 className="mt-7 text-lg font-bold">{step.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-[#596273]">
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* KNOWLEDGE PACKS */}
      <section id="knowledge-packs" className="scroll-mt-10 bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <span className="text-sm font-bold uppercase tracking-widest text-[#B83E32]">
                Learn without limits
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Knowledge that travels with you.
              </h2>

              <p className="mt-5 leading-7 text-[#596273]">
                Explore downloadable knowledge packs covering useful programming
                and computer science topics.
              </p>
            </div>

            <Link
              to={getStartedLink}
              className="inline-flex items-center gap-2 font-semibold text-[#B83E32] transition hover:gap-3"
            >
              Explore Mind Vault
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => {
              const Icon = pack.icon;

              return (
                <article
                  key={pack.title}
                  className="rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F47768]/15 text-[#B83E32]">
                      <Icon size={23} />
                    </div>

                    <span className="rounded-full bg-[#17243D]/5 px-3 py-1 text-xs font-semibold text-[#596273]">
                      {pack.label}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold">{pack.title}</h3>

                  <p className="mt-3 text-sm leading-7 text-[#596273]">
                    {pack.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#B83E32]">
                    <Download size={16} />
                    Download for offline access
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="bg-[#17243D] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-[#F47768]">
            <BookOpen size={32} />
          </div>

          <h2 className="mt-8 text-3xl font-bold leading-tight text-white sm:text-5xl">
            Your knowledge deserves
            <br className="hidden sm:block" />a permanent home.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl leading-8 text-white/75">
            Start building your personal knowledge library today. Save what
            matters and access it whenever you need it.
          </p>

          <Link
            to={getStartedLink}
            className="mt-10 inline-flex items-center justify-center rounded-xl bg-[#F47768] px-8 py-4 font-bold text-[#17243D] transition hover:-translate-y-1 hover:bg-[#FF8A7D]"
          >
            Get Started for Free
            <ArrowRight className="ml-3" size={19} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#101B30] text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
          {/* BRAND */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F47768] text-[#17243D]">
                <BookOpen size={23} />
              </div>

              <span className="text-xl font-bold">Mind Vault</span>
            </Link>

            <p className="mt-6 max-w-xs text-sm leading-7 text-white/65">
              A personal knowledge space designed to keep your thoughts,
              learning, and discoveries accessible — even offline.
            </p>

            <p className="mt-5 text-sm font-semibold text-[#F47768]">
              Your Knowledge. Your Memory. Always Available.
            </p>
          </div>

          {/* EXPLORE */}
          <div>
            <h3 className="font-bold">Explore</h3>

            <ul className="mt-6 space-y-4 text-sm text-white/65">
              <li>
                <a href="#features" className="transition hover:text-[#F47768]">
                  Features
                </a>
              </li>

              <li>
                <a
                  href="#how-it-works"
                  className="transition hover:text-[#F47768]"
                >
                  How It Works
                </a>
              </li>

              <li>
                <a
                  href="#knowledge-packs"
                  className="transition hover:text-[#F47768]"
                >
                  Knowledge Packs
                </a>
              </li>
            </ul>
          </div>

          {/* ACCOUNT */}
          <div>
            <h3 className="font-bold">Your Account</h3>

            <ul className="mt-6 space-y-4 text-sm text-white/65">
              <li>
                <Link
                  to={isAuthenticated ? "/dashboard" : "/login"}
                  className="transition hover:text-[#F47768]"
                >
                  {isAuthenticated ? "Dashboard" : "Sign In"}
                </Link>
              </li>

              <li>
                <Link
                  to={getStartedLink}
                  className="transition hover:text-[#F47768]"
                >
                  {isAuthenticated ? "Open Workspace" : "Create Account"}
                </Link>
              </li>

              {isAuthenticated && (
                <li>
                  <Link
                    to="/library"
                    className="transition hover:text-[#F47768]"
                  >
                    My Library
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* HIGHLIGHTS */}
          <div>
            <h3 className="font-bold">Built For</h3>

            <ul className="mt-6 space-y-4 text-sm text-white/65">
              <li className="flex items-center gap-3">
                <WifiOff size={17} className="text-[#F47768]" />
                Offline learning
              </li>

              <li className="flex items-center gap-3">
                <Languages size={17} className="text-[#F47768]" />
                Multilingual knowledge
              </li>

              <li className="flex items-center gap-3">
                <Search size={17} className="text-[#F47768]" />
                Fast knowledge search
              </li>

              <li className="flex items-center gap-3">
                <ShieldCheck size={17} className="text-[#F47768]" />
                Personal knowledge management
              </li>
            </ul>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between lg:px-10">
            <p>
              Copyright {new Date().getFullYear()} Mind Vault. All rights
              reserved.
            </p>

            <p>Built to keep knowledge within reach.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;
