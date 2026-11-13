import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  ArrowRight,
  BookOpen,
  Check,
  Menu,
  X,
  Wifi,
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
  Layers,
  Lock,
  Command,
  ChevronRight,
  CircleCheck,
  ArrowUpRight,
} from "lucide-react";

import { useAuthStore } from "../../../stores/auth.store";
import PageMetadata from "../../../components/common/PageMetadata";

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [searchIndex, setSearchIndex] = useState(0);

  const shouldReduceMotion = useReducedMotion();

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

  const searchExamples = [
    "Search JavaScript concepts...",
    "Find your saved notes...",
    "Explore Python fundamentals...",
    "Discover your knowledge...",
  ];

  // Rotating search demonstration.
  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setSearchIndex((previous) => (
        previous + 1
      ) % searchExamples.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, [searchExamples.length, shouldReduceMotion]);

  // Reveal sections when they enter the viewport.
  useEffect(() => {
    const elements = document.querySelectorAll(".mv-reveal");

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      elements.forEach((element) => {
        element.classList.add("mv-visible");
      });

      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("mv-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: WifiOff,
      title: "Works Offline",
      description:
        "Access your saved notes and downloaded knowledge packs even without an internet connection.",
      color: "coral",
      tag: "Always available",
    },
    {
      icon: Languages,
      title: "Multilingual Knowledge",
      description:
        "Organize and explore knowledge across multiple languages with multilingual search support.",
      color: "mint",
      tag: "Multiple languages",
    },
    {
      icon: Search,
      title: "Powerful Search",
      description:
        "Find your saved notes and downloaded learning materials using fast local search.",
      color: "blue",
      tag: "Instant discovery",
    },
    {
      icon: RefreshCw,
      title: "Smart Synchronization",
      description:
        "Synchronize your changes when you're back online, with conflict protection for your data.",
      color: "purple",
      tag: "Conflict protection",
    },
    {
      icon: BrainCircuit,
      title: "AI Knowledge Assistant",
      description:
        "Get AI-assisted answers using your knowledge and relevant saved information when online.",
      color: "mint",
      tag: "AI powered",
    },
    {
      icon: ShieldCheck,
      title: "Your Personal Space",
      description:
        "Keep your notes and learning materials organized in your own personal knowledge workspace.",
      color: "blue",
      tag: "Personal workspace",
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
      number: "01",
    },
    {
      title: "JavaScript",
      description:
        "Learn JavaScript fundamentals, concepts, and practical topics.",
      icon: FileText,
      label: "Programming",
      number: "02",
    },
    {
      title: "Python",
      description:
        "Explore Python programming concepts and useful learning materials.",
      icon: BrainCircuit,
      label: "Programming",
      number: "03",
    },
    {
      title: "Data Structures & Algorithms",
      description:
        "Understand essential data structures and algorithmic concepts.",
      icon: FolderOpen,
      label: "Computer Science",
      number: "04",
    },
    {
      title: "Computer Science",
      description:
        "Build your understanding of important computer science topics.",
      icon: Layers,
      label: "Fundamentals",
      number: "05",
    },
  ];

  return (
    <main className="mv-page min-h-screen overflow-hidden bg-[#FFFAF1] text-[#17243D]">

      <PageMetadata
        title="Mind Vault - Your Knowledge, Your Memory, Always Available"
        description="Mind Vault is your offline-first personal knowledge platform. Organize notes, explore downloadable knowledge packs, search your knowledge, and learn anywhere."
        robots="index, follow"
      />

      <style>{`
        .mv-page {
          --navy: #17243D;
          --coral: #F47768;
          --cream: #FFFAF1;
          --teal: #287C72;
        }

        .mv-page ::selection {
          background: #F47768;
          color: #17243D;
        }

        @keyframes mv-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-13px);
          }
        }

        @keyframes mv-float-slow {
          0%, 100% {
            transform: translateY(0) rotate(-2deg);
          }
          50% {
            transform: translateY(-9px) rotate(1deg);
          }
        }

        @keyframes mv-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(40, 124, 114, 0.25);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(40, 124, 114, 0);
          }
        }

        @keyframes mv-glow {
          0%, 100% {
            opacity: .35;
            transform: scale(1);
          }
          50% {
            opacity: .65;
            transform: scale(1.08);
          }
        }

        @keyframes mv-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes mv-gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes mv-fade-up {
          from {
            opacity: 0;
            transform: translateY(25px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mv-float {
          animation: mv-float 5s ease-in-out infinite;
        }

        .mv-float-slow {
          animation: mv-float-slow 7s ease-in-out infinite;
        }

        .mv-pulse {
          animation: mv-pulse 2s infinite;
        }

        .mv-glow {
          animation: mv-glow 6s ease-in-out infinite;
        }

        .mv-gradient {
          background-size: 200% 200%;
          animation: mv-gradient 8s ease infinite;
        }

        .mv-reveal {
          opacity: 1;
          transform: translateY(0);
        }

        .mv-reveal.mv-visible {
          animation: mv-fade-up .75s ease both;
        }

        .mv-card {
          transition:
            transform .3s ease,
            box-shadow .3s ease,
            border-color .3s ease;
        }

        .mv-card:hover {
          transform: translateY(-7px);
          box-shadow: 0 22px 45px rgba(23, 36, 61, .09);
          border-color: rgba(244, 119, 104, .45);
        }

        .mv-icon {
          transition: transform .35s ease;
        }

        .mv-card:hover .mv-icon {
          transform: rotate(-8deg) scale(1.12);
        }

        .mv-button {
          transition:
            transform .25s ease,
            box-shadow .25s ease,
            background-color .25s ease;
        }

        .mv-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 25px rgba(23, 36, 61, .16);
        }

        .mv-orb {
          filter: blur(70px);
          pointer-events: none;
        }

        .mv-marquee {
          animation: mv-marquee 32s linear infinite;
          width: max-content;
        }

        .mv-marquee:hover {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .mv-page *,
          .mv-page *::before,
          .mv-page *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      {/* NAVIGATION */}

      <header className="relative z-50 border-b border-[#17243D]/10 bg-[#FFFAF1]/90 backdrop-blur-xl">

        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">

          <Link
            to="/"
            className="group flex items-center gap-3"
            aria-label="Mind Vault home"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#17243D] text-[#F47768] shadow-lg transition duration-300 group-hover:rotate-6 group-hover:scale-110">
              <BookOpen size={24} />
            </div>

            <span className="text-xl font-bold tracking-tight">
              Mind Vault
              <span className="ml-1 text-[#F47768]">.</span>
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

          <div className="hidden items-center gap-6 md:flex">

            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="text-sm font-semibold transition hover:text-[#B83E32]"
            >
              {isAuthenticated ? "Dashboard" : "Sign in"}
            </Link>

            <Link
              to={getStartedLink}
              className="mv-button inline-flex items-center rounded-xl bg-[#17243D] px-5 py-3 text-sm font-semibold text-white"
            >
              Get Started
              <ArrowRight className="ml-2" size={16} />
            </Link>

          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="rounded-xl p-2 transition hover:bg-[#17243D]/5 md:hidden"
          >
            {menuOpen
              ? <X size={24} />
              : <Menu size={24} />
            }
          </button>

        </nav>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.div
              id="mobile-navigation"
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, height: 0 }
              }
              animate={{ opacity: 1, height: "auto" }}
              exit={
                shouldReduceMotion
                  ? undefined
                  : { opacity: 0, height: 0 }
              }
              transition={{
                duration: shouldReduceMotion ? 0 : 0.25,
              }}
              className="overflow-hidden border-t border-[#17243D]/10 bg-[#FFFAF1] px-6 py-6 md:hidden"
            >
              <div className="flex flex-col gap-5">

                {navigation.map((item, index) => (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, x: -12 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: shouldReduceMotion ? 0 : index * 0.05,
                    }}
                    className="text-sm font-medium text-[#596273] transition hover:text-[#B83E32]"
                  >
                    {item.label}
                  </motion.a>
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
                  className="mv-button rounded-xl bg-[#17243D] px-5 py-3 text-center text-sm font-semibold text-white"
                >
                  Get Started
                </Link>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </header>

      {/* HERO SECTION */}

      <section className="relative isolate">

        <div className="mv-orb mv-glow absolute -right-32 top-20 h-96 w-96 rounded-full bg-[#F47768]/25" />

        <div className="mv-orb absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-[#287C72]/15" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-28">

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

              <span className="relative inline-block text-[#B83E32]">
                Always Available.
              </span>

            </h1>

            <p className="mt-8 max-w-xl text-lg leading-8 text-[#596273]">
              Capture your thoughts, organize what you learn, and
              build your personal knowledge library. Everything
              stays accessible, even when the internet disappears.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">

              <Link
                to={getStartedLink}
                className="mv-button inline-flex items-center justify-center rounded-xl bg-[#17243D] px-7 py-4 font-semibold text-white shadow-xl shadow-[#17243D]/15"
              >
                Start Building Your Vault
                <ArrowRight className="ml-3" size={19} />
              </Link>

              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-[#17243D]/20 px-7 py-4 font-semibold transition hover:border-[#F47768] hover:bg-[#F47768]/5"
              >
                Explore Features
              </a>

            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-[#596273]">

              {[
                "Offline-first",
                "Multilingual",
                "Your own knowledge",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check size={17} className="text-[#287C72]" />
                  {item}
                </span>
              ))}

            </div>

            <div className="mt-12 flex items-center gap-4">

              <div className="flex -space-x-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FFFAF1] bg-[#17243D] text-white">
                  <BrainCircuit size={16} />
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FFFAF1] bg-[#287C72] text-white">
                  <Cloud size={16} />
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FFFAF1] bg-[#F47768] text-[#17243D]">
                  <BookOpen size={16} />
                </div>
              </div>

              <p className="text-xs leading-5 text-[#596273]">
                Built for curious minds.
                <br />
                Designed for uninterrupted learning.
              </p>

            </div>

          </div>

          {/* INTERACTIVE HERO WORKSPACE */}

          <div className="relative mx-auto w-full max-w-xl">

            <div className="mv-orb mv-glow absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[#F47768]/30" />

            <div className="mv-orb absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-[#287C72]/20" />

            {/* MAIN WORKSPACE */}

            <div className="relative rounded-3xl border border-[#17243D]/10 bg-white/90 p-5 shadow-2xl shadow-[#17243D]/10 backdrop-blur-xl sm:p-7">

              {/* WORKSPACE HEADER */}

              <div className="flex items-center justify-between border-b border-[#17243D]/10 pb-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#17243D] text-[#F47768]">
                    <BookOpen size={22} />
                  </div>

                  <div>
                    <p className="font-bold">
                      My Knowledge Vault
                    </p>

                    <p className="text-xs text-[#596273]">
                      Your personal workspace
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => setIsOffline(!isOffline)}
                  aria-label="Toggle online and offline workspace demonstration"
                  aria-pressed={isOffline}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    isOffline
                      ? "bg-[#F47768]/15 text-[#B83E32]"
                      : "bg-[#E4F2EC] text-[#287C72]"
                  }`}
                >

                  <span
                    className={`h-2 w-2 rounded-full ${
                      isOffline
                        ? "bg-[#B83E32]"
                        : "bg-[#287C72] mv-pulse"
                    }`}
                  />

                  {isOffline ? "Offline mode" : "Available online"}

                </button>

              </div>

              {/* SEARCH DEMO */}

              <div className="mt-6 flex items-center gap-3 rounded-xl bg-[#F8F1E5] px-4 py-4">

                <Search size={19} className="shrink-0 text-[#287C72]" />

                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={searchIndex}
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, y: 8 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={
                      shouldReduceMotion
                        ? undefined
                        : { opacity: 0, y: -8 }
                    }
                    transition={{ duration: 0.25 }}
                    className="text-sm text-[#596273]"
                  >
                    {searchExamples[searchIndex]}
                  </motion.span>
                </AnimatePresence>

                <Command
                  size={17}
                  className="ml-auto shrink-0 text-[#596273]/60"
                />

              </div>

              {/* STATISTICS */}

              <div className="mt-6 grid grid-cols-2 gap-4">

                <div className="mv-card rounded-2xl border border-[#17243D]/5 bg-[#F8F1E5] p-5">

                  <div className="mb-4 flex items-center justify-between">
                    <FileText className="text-[#B83E32]" size={23} />

                    <ArrowUpRight size={17} className="text-[#287C72]" />
                  </div>

                  <p className="text-3xl font-bold">
                    128
                  </p>

                  <p className="mt-1 text-xs text-[#596273]">
                    Saved Notes
                  </p>

                </div>

                <div className="mv-card rounded-2xl border border-[#17243D]/5 bg-[#E4F2EC] p-5">

                  <div className="mb-4 flex items-center justify-between">
                    <BookOpen className="text-[#287C72]" size={23} />

                    <ArrowUpRight size={17} className="text-[#287C72]" />
                  </div>

                  <p className="text-3xl font-bold">
                    05
                  </p>

                  <p className="mt-1 text-xs text-[#596273]">
                    Knowledge Packs
                  </p>

                </div>

              </div>

              {/* RECENT NOTES */}

              <div className="mt-7">

                <div className="mb-4 flex items-center justify-between">

                  <p className="font-bold">
                    Recently Saved
                  </p>

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

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {title}
                      </p>

                      <p className="mt-1 text-xs text-[#596273]">
                        {index + 1} day{index === 0 ? "" : "s"} ago
                      </p>
                    </div>

                    <CircleCheck
                      size={17}
                      className="ml-auto shrink-0 text-[#287C72]"
                    />

                  </div>

                ))}

              </div>

              {/* OFFLINE BANNER */}

              <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#17243D] p-4 text-white">

                {isOffline
                  ? <WifiOff size={21} className="shrink-0 text-[#F47768]" />
                  : <Wifi size={21} className="shrink-0 text-[#7AD2B8]" />
                }

                <div>
                  <p className="text-sm font-semibold">
                    {isOffline
                      ? "You're offline. Keep learning."
                      : "Everything is synchronized."
                    }
                  </p>

                  <p className="mt-1 text-xs text-white/70">
                    {isOffline
                      ? "Your downloaded knowledge is still available."
                      : "Your knowledge is ready whenever you need it."
                    }
                  </p>
                </div>

                <ShieldCheck
                  className="ml-auto shrink-0 text-[#F47768]"
                  size={23}
                />

              </div>

            </div>

            {/* FLOATING KNOWLEDGE CARD */}

            <div className="mv-float absolute -left-8 top-28 hidden rounded-2xl border border-[#17243D]/10 bg-white p-4 shadow-xl sm:block">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E4F2EC] text-[#287C72]">
                  <BrainCircuit size={20} />
                </div>

                <div>
                  <p className="text-xs font-bold">
                    AI Assistant
                  </p>

                  <p className="text-[10px] text-[#596273]">
                    Knowledge ready
                  </p>
                </div>

              </div>

              <div className="mt-3 h-1.5 w-32 overflow-hidden rounded-full bg-[#E4F2EC]">
                <div className="h-full w-4/5 rounded-full bg-[#287C72]" />
              </div>

            </div>

            {/* FLOATING SYNC CARD */}

            <div className="mv-float-slow absolute -right-7 bottom-28 hidden rounded-2xl border border-[#17243D]/10 bg-white p-4 shadow-xl sm:block">

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F47768]/15 text-[#B83E32]">
                  <RefreshCw size={18} />
                </div>

                <div>
                  <p className="text-xs font-bold">
                    Smart Sync
                  </p>

                  <p className="text-[10px] text-[#287C72]">
                    All changes saved
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* TRUST STRIP */}

      <section className="overflow-hidden border-y border-[#17243D]/10 bg-white py-7">

        <div className="mx-auto max-w-7xl px-6 text-center">

          <p className="mb-6 text-xs font-bold uppercase tracking-[.2em] text-[#596273]">
            Everything your knowledge needs
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">

            {[
              { icon: WifiOff, label: "Offline First" },
              { icon: Languages, label: "Multilingual" },
              { icon: Search, label: "Local Search" },
              { icon: ShieldCheck, label: "Secure Workspace" },
              { icon: BrainCircuit, label: "AI Powered" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-sm font-semibold text-[#596273]"
                >
                  <Icon size={18} className="text-[#287C72]" />
                  {item.label}
                </div>
              );
            })}

          </div>

        </div>

      </section>

      {/* FEATURES */}

      <section id="features" className="scroll-mt-10 bg-[#FFFAF1] py-24">

        <div className="mx-auto max-w-7xl px-6 lg:px-10">

          <div className="mv-reveal mx-auto max-w-2xl text-center">

            <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#B83E32]">
              <Sparkles size={16} />
              Everything in one place
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              A smarter way to manage your knowledge.
            </h2>

            <p className="mt-5 leading-7 text-[#596273]">
              More than a note-taking application. Mind Vault helps
              you collect, organize, discover, and access your
              knowledge wherever you are.
            </p>

          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {features.map((feature, index) => {

              const Icon = feature.icon;

              const colors: Record<string, string> = {
                coral: "bg-[#F47768]/15 text-[#B83E32]",
                mint: "bg-[#E4F2EC] text-[#287C72]",
                blue: "bg-[#EAF0F8] text-[#41658F]",
                purple: "bg-purple-100 text-purple-700",
              };

              return (

                <article
                  key={feature.title}
                  className="mv-card mv-reveal rounded-2xl border border-[#17243D]/10 bg-white p-7"
                  style={{
                    animationDelay: `${index * 90}ms`,
                  }}
                >

                  <div className="flex items-center justify-between">

                    <div className={`mv-icon flex h-13 w-13 items-center justify-center rounded-xl p-3 ${colors[feature.color]}`}>
                      <Icon size={25} />
                    </div>

                    <span className="rounded-full bg-[#17243D]/5 px-3 py-1 text-[10px] font-semibold text-[#596273]">
                      {feature.tag}
                    </span>

                  </div>

                  <h3 className="mt-7 text-lg font-bold">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#596273]">
                    {feature.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#287C72]">
                    <CircleCheck size={15} />
                    Built into Mind Vault
                  </div>

                </article>

              );

            })}

          </div>

        </div>

      </section>

      {/* HOW IT WORKS */}

      <section
        id="how-it-works"
        className="scroll-mt-10 bg-[#F8F1E5] py-24"
      >

        <div className="mx-auto max-w-7xl px-6 lg:px-10">

          <div className="mv-reveal mx-auto max-w-2xl text-center">

            <span className="text-sm font-bold uppercase tracking-widest text-[#B83E32]">
              Simple by design
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Your knowledge. Four simple steps.
            </h2>

            <p className="mt-5 leading-7 text-[#596273]">
              Build your personal knowledge library and take it
              with you, even when you go offline.
            </p>

          </div>

          <div className="relative mt-20 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

            <div className="absolute left-[12%] right-[12%] top-7 hidden border-t-2 border-dashed border-[#287C72]/30 lg:block" />

            {steps.map((step, index) => {

              const Icon = step.icon;

              return (

                <article
                  key={step.number}
                  className="mv-reveal relative"
                  style={{
                    animationDelay: `${index * 120}ms`,
                  }}
                >

                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-[#F8F1E5] bg-[#17243D] text-[#F47768] shadow-lg">
                    <Icon size={25} />
                  </div>

                  <span className="mt-7 block text-sm font-bold tracking-widest text-[#B83E32]">
                    STEP {step.number}
                  </span>

                  <h3 className="mt-3 text-lg font-bold">
                    {step.title}
                  </h3>

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

      <section
        id="knowledge-packs"
        className="scroll-mt-10 bg-white py-24"
      >

        <div className="mx-auto max-w-7xl px-6 lg:px-10">

          <div className="mv-reveal flex flex-col justify-between gap-6 md:flex-row md:items-end">

            <div className="max-w-2xl">

              <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[#B83E32]">
                <BookOpen size={16} />
                Learn without limits
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
                Knowledge that travels with you.
              </h2>

              <p className="mt-5 leading-7 text-[#596273]">
                Explore downloadable knowledge packs covering
                useful programming and computer science topics.
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

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {packs.map((pack, index) => {

              const Icon = pack.icon;

              return (

                <Link
                  key={pack.title}
                  to={isAuthenticated ? "/library" : "/register"}
                  className="mv-card mv-reveal group rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >

                  <div className="flex items-center justify-between">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F47768]/15 text-[#B83E32] transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                      <Icon size={23} />
                    </div>

                    <span className="rounded-full bg-[#17243D]/5 px-3 py-1 text-xs font-semibold text-[#596273]">
                      {pack.label}
                    </span>

                  </div>

                  <div className="mt-7 flex items-center justify-between">

                    <span className="text-xs font-bold tracking-widest text-[#287C72]">
                      PACK {pack.number}
                    </span>

                    <ArrowUpRight
                      size={19}
                      className="text-[#596273] transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#B83E32]"
                    />

                  </div>

                  <h3 className="mt-3 text-lg font-bold">
                    {pack.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#596273]">
                    {pack.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[#B83E32]">
                    <Download size={16} />
                    Explore knowledge pack
                    <ChevronRight
                      size={16}
                      className="ml-auto transition group-hover:translate-x-1"
                    />
                  </div>

                </Link>

              );

            })}

          </div>

        </div>

      </section>

      {/* HIGHLIGHT SECTION */}

      <section className="relative overflow-hidden bg-[#17243D] py-24 text-white">

        <div className="mv-orb mv-glow absolute -right-32 top-0 h-96 w-96 rounded-full bg-[#F47768]/20" />

        <div className="mv-orb absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-[#287C72]/25" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2 lg:px-10">

          <div className="mv-reveal">

            <span className="text-sm font-bold uppercase tracking-widest text-[#F47768]">
              Your knowledge stays yours
            </span>

            <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
              The internet is optional.
              <br />
              Your knowledge isn't.
            </h2>

            <p className="mt-6 max-w-xl leading-8 text-white/65">
              Keep your notes and downloaded learning materials
              available locally. Continue learning even when
              connectivity is unavailable.
            </p>

            <Link
              to={getStartedLink}
              className="mv-button mt-9 inline-flex items-center gap-3 rounded-xl bg-[#F47768] px-7 py-4 font-bold text-[#17243D]"
            >
              Build Your Knowledge Vault
              <ArrowRight size={19} />
            </Link>

          </div>

          <div className="mv-reveal grid grid-cols-2 gap-4">

            {[
              {
                icon: Lock,
                title: "Personal",
                subtitle: "Your own workspace",
              },
              {
                icon: WifiOff,
                title: "Offline",
                subtitle: "Learn anywhere",
              },
              {
                icon: Search,
                title: "Discoverable",
                subtitle: "Find information fast",
              },
              {
                icon: RefreshCw,
                title: "Synchronized",
                subtitle: "Sync when connected",
              },
            ].map((item) => {

              const Icon = item.icon;

              return (

                <div
                  key={item.title}
                  className="mv-card rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                >

                  <Icon size={26} className="text-[#F47768]" />

                  <h3 className="mt-6 font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-white/60">
                    {item.subtitle}
                  </p>

                </div>

              );

            })}

          </div>

        </div>

      </section>

      {/* CALL TO ACTION */}

      <section className="relative overflow-hidden bg-[#FFFAF1] py-28">

        <div className="mv-orb absolute left-1/4 top-0 h-80 w-80 rounded-full bg-[#F47768]/20" />

        <div className="mv-orb absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-[#287C72]/15" />

        <div className="mv-reveal relative mx-auto max-w-4xl px-6 text-center">

          <div className="mv-float mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#17243D] text-[#F47768] shadow-xl">
            <BookOpen size={32} />
          </div>

          <span className="mt-8 inline-block text-sm font-bold uppercase tracking-widest text-[#B83E32]">
            Start your journey
          </span>

          <h2 className="mt-5 text-3xl font-bold leading-tight sm:text-6xl">
            Your knowledge deserves
            <br className="hidden sm:block" />
            a permanent home.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl leading-8 text-[#596273]">
            Start building your personal knowledge library today.
            Save what matters and access it whenever you need it.
          </p>

          <Link
            to={getStartedLink}
            className="mv-button mt-10 inline-flex items-center justify-center rounded-xl bg-[#17243D] px-8 py-4 font-bold text-white"
          >
            Get Started for Free
            <ArrowRight className="ml-3" size={19} />
          </Link>

          <p className="mt-5 text-xs text-[#596273]">
            Your Knowledge. Your Memory. Always Available.
          </p>

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

              <span className="text-xl font-bold">
                Mind Vault
              </span>

            </Link>

            <p className="mt-6 max-w-xs text-sm leading-7 text-white/65">
              A personal knowledge space designed to keep
              your thoughts, learning, and discoveries
              accessible — even offline.
            </p>

            <p className="mt-5 text-sm font-semibold text-[#F47768]">
              Your Knowledge. Your Memory. Always Available.
            </p>

          </div>

          {/* EXPLORE */}

          <div>

            <h3 className="font-bold">
              Explore
            </h3>

            <ul className="mt-6 space-y-4 text-sm text-white/65">

              {navigation.map((item) => (

                <li key={item.label}>
                  <a
                    href={item.href}
                    className="transition hover:text-[#F47768]"
                  >
                    {item.label}
                  </a>
                </li>

              ))}

            </ul>

          </div>

          {/* ACCOUNT */}

          <div>

            <h3 className="font-bold">
              Your Account
            </h3>

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

            <h3 className="font-bold">
              Built For
            </h3>

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
              Copyright {new Date().getFullYear()} Mind Vault.
              All rights reserved.
            </p>

            <p>
              Built to keep knowledge within reach.
            </p>

          </div>

        </div>

      </footer>

    </main>
  );
}

export default LandingPage;