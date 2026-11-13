import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  BookOpen,
  Loader2,
  WifiOff,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";

import Sidebar from "../../dashboard/components/Sidebar";
import DashboardHeader from "../../dashboard/components/DashboardHeader";

import {
  searchOfflineContent,
  type SearchResult,
} from "../../../services/search.service";

type SearchFilter = "all" | "note" | "pack";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function SearchPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilter] = useState<SearchFilter>("all");

  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // OFFLINE SEARCH
  useEffect(() => {
    let cancelled = false;

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const searchResults = await searchOfflineContent(
          trimmedQuery,
        );

        if (!cancelled) {
          setResults(searchResults);
          setSearched(true);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Search failed. Please try again.",
          );

          setSearched(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  // HANDLE SEARCH INPUT
  const handleQueryChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;

    setQuery(value);

    if (value.trim()) {
      setLoading(true);
      setError("");
      setSearched(false);
      setResults([]);
    } else {
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError("");
    }
  };

  // FILTER RESULTS
  const filteredResults = results.filter((result) => {
    if (filter === "all") return true;

    return result.type === filter;
  });

  // OPEN SEARCH RESULT
  const handleOpenResult = (result: SearchResult) => {
    if (result.type === "note" && result.noteId) {
      navigate(
        `/notes?noteId=${encodeURIComponent(result.noteId)}`,
      );
      return;
    }

    if (result.type === "pack" && result.packId) {
      navigate(`/library/read/${result.packId}`);
    }
  };

  // CLEAR SEARCH
  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setLoading(false);
    setError("");
  };

  return (
    <div className="flex min-h-screen bg-[#F8F1E5]">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="min-w-0 flex-1">
        <DashboardHeader
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.35,
          }}
          className="mx-auto max-w-[1400px] p-5 md:p-8"
        >
          {/* PAGE HEADING */}
          <motion.div
            variants={shouldReduceMotion ? undefined : containerVariants}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            className="mb-8"
          >
            <motion.div
              variants={shouldReduceMotion ? undefined : itemVariants}
              className="mb-3 flex items-center gap-2 text-[#F47768]"
            >
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { rotate: [0, 12, -8, 0] }
                }
                transition={{
                  duration: 2.5,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  repeatDelay: 3,
                }}
              >
                <Sparkles size={20} />
              </motion.div>

              <span className="text-xs font-bold uppercase tracking-widest">
                Find Your Knowledge
              </span>
            </motion.div>

            <motion.h1
              variants={shouldReduceMotion ? undefined : itemVariants}
              className="text-3xl font-bold text-[#17243D] md:text-4xl"
            >
              Search Everything
            </motion.h1>

            <motion.p
              variants={shouldReduceMotion ? undefined : itemVariants}
              className="mt-3 max-w-2xl text-sm leading-6 text-gray-500"
            >
              Search through your personal notes and downloaded
              knowledge packs, even when you are offline.
            </motion.p>
          </motion.div>

          {/* OFFLINE SEARCH INFORMATION */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
            className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4"
          >
            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : { y: [0, -3, 0] }
              }
              transition={{
                duration: 2.5,
                repeat: shouldReduceMotion ? 0 : Infinity,
              }}
            >
              <WifiOff
                size={20}
                className="shrink-0 text-green-700"
              />
            </motion.div>

            <div>
              <p className="text-sm font-semibold text-green-800">
                Local Search Enabled
              </p>

              <p className="mt-1 text-xs text-green-700">
                Your search runs using content stored on this device.
                Internet connection is not required.
              </p>
            </div>
          </motion.div>

          {/* SEARCH INPUT */}
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.45,
              delay: shouldReduceMotion ? 0 : 0.1,
            }}
            className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 shadow-sm md:p-7"
          >
            <motion.div
              whileFocus={undefined}
              className="relative"
            >
              <motion.div
                animate={
                  query
                    ? { scale: 1.08, color: "#F47768" }
                    : { scale: 1, color: "#9CA3AF" }
                }
                transition={{ duration: 0.2 }}
                className="absolute left-5 top-1/2 -translate-y-1/2"
              >
                <Search size={22} />
              </motion.div>

              <input
                type="search"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search notes, programming, concepts..."
                className="w-full rounded-2xl border border-[#17243D]/10 bg-[#F8F1E5]/60 py-5 pl-14 pr-14 text-sm text-[#17243D] outline-none transition placeholder:text-gray-400 focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/10 md:text-base"
              />

              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, scale: 0.7 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    whileHover={
                      shouldReduceMotion ? undefined : { rotate: 90 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.85 }
                    }
                    onClick={handleClearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-400 transition hover:bg-[#F47768]/10 hover:text-[#F47768]"
                    aria-label="Clear search"
                  >
                    <X size={19} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

            {/* SEARCH SUGGESTIONS */}
            <AnimatePresence>
              {!query && (
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, height: 0 }
                  }
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 0.25,
                  }}
                  className="mt-5 overflow-hidden"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Try searching for
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {[
                      "JavaScript",
                      "Python",
                      "Data Structures",
                      "Web Development",
                    ].map((suggestion, index) => (
                      <motion.button
                        key={suggestion}
                        initial={
                          shouldReduceMotion
                            ? false
                            : { opacity: 0, y: 8 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: shouldReduceMotion ? 0 : index * 0.06,
                        }}
                        whileHover={
                          shouldReduceMotion
                            ? undefined
                            : { y: -3, scale: 1.03 }
                        }
                        whileTap={
                          shouldReduceMotion
                            ? undefined
                            : { scale: 0.96 }
                        }
                        onClick={() => {
                          setQuery(suggestion);
                          setLoading(true);
                          setError("");
                          setSearched(false);
                          setResults([]);
                        }}
                        className="rounded-full border border-[#17243D]/10 px-4 py-2 text-xs font-medium text-[#17243D] transition hover:border-[#F47768] hover:bg-[#F47768]/5"
                      >
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* SEARCH RESULTS */}
          <AnimatePresence>
            {query.trim() && (
              <motion.section
                key="search-results"
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, y: 18 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.3,
                }}
                className="mt-8"
              >
                {/* RESULT HEADER */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#17243D]">
                      Search Results
                    </h2>

                    <p className="mt-1 text-xs text-gray-500">
                      Results for "{query}"
                    </p>
                  </div>

                  <AnimatePresence mode="wait">
                    {!loading && searched && (
                      <motion.span
                        key={filteredResults.length}
                        initial={
                          shouldReduceMotion
                            ? false
                            : { opacity: 0, scale: 0.8 }
                        }
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="rounded-full bg-[#F47768]/10 px-4 py-2 text-xs font-semibold text-[#F47768]"
                      >
                        {filteredResults.length} results
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* FILTER BUTTONS */}
                <div className="mb-6 flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "Everything" },
                    { value: "note", label: "My Notes" },
                    { value: "pack", label: "Knowledge Packs" },
                  ].map((item) => (
                    <motion.button
                      key={item.value}
                      whileHover={
                        shouldReduceMotion ? undefined : { y: -2 }
                      }
                      whileTap={
                        shouldReduceMotion ? undefined : { scale: 0.96 }
                      }
                      onClick={() =>
                        setFilter(item.value as SearchFilter)
                      }
                      className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                        filter === item.value
                          ? "bg-[#17243D] text-white"
                          : "border border-[#17243D]/10 bg-[#FFFAF1] text-gray-600 hover:border-[#F47768]"
                      }`}
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </div>

                {/* SEARCH STATES AND RESULTS */}
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={
                        shouldReduceMotion
                          ? false
                          : { opacity: 0, y: 10 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-2xl bg-[#FFFAF1] p-12 text-center"
                    >
                      <Loader2
                        size={30}
                        className="mx-auto mb-3 animate-spin text-[#F47768]"
                      />

                      <p className="text-sm text-gray-500">
                        Searching your knowledge...
                      </p>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={
                        shouldReduceMotion
                          ? false
                          : { opacity: 0, scale: 0.97 }
                      }
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600"
                    >
                      {error}
                    </motion.div>
                  ) : searched && filteredResults.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={
                        shouldReduceMotion
                          ? false
                          : { opacity: 0, y: 12 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-12 text-center"
                    >
                      <motion.div
                        animate={
                          shouldReduceMotion
                            ? undefined
                            : { y: [0, -5, 0] }
                        }
                        transition={{
                          duration: 2.5,
                          repeat: shouldReduceMotion ? 0 : Infinity,
                        }}
                      >
                        <Search
                          size={38}
                          className="mx-auto text-gray-300"
                        />
                      </motion.div>

                      <h3 className="mt-4 font-bold text-[#17243D]">
                        No results found
                      </h3>

                      <p className="mt-2 text-sm text-gray-500">
                        Try another keyword or change your search filter.
                      </p>
                    </motion.div>
                  ) : !loading &&
                    !error &&
                    filteredResults.length > 0 ? (
                    <motion.div
                      key="results"
                      variants={
                        shouldReduceMotion
                          ? undefined
                          : containerVariants
                      }
                      initial={
                        shouldReduceMotion ? false : "hidden"
                      }
                      animate="visible"
                      className="space-y-4"
                    >
                      {filteredResults.map((result) => (
                        <motion.button
                          key={result.id}
                          variants={
                            shouldReduceMotion
                              ? undefined
                              : itemVariants
                          }
                          layout={!shouldReduceMotion}
                          whileHover={
                            shouldReduceMotion
                              ? undefined
                              : {
                                  y: -3,
                                  scale: 1.005,
                                }
                          }
                          whileTap={
                            shouldReduceMotion
                              ? undefined
                              : { scale: 0.99 }
                          }
                          onClick={() => handleOpenResult(result)}
                          className="group w-full rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 text-left shadow-sm transition hover:border-[#F47768]/50 hover:shadow-md md:p-6"
                        >
                          <div className="flex items-start gap-4">
                            {/* RESULT ICON */}
                            <motion.div
                              whileHover={
                                shouldReduceMotion
                                  ? undefined
                                  : { rotate: -5, scale: 1.08 }
                              }
                              className={`shrink-0 rounded-xl p-3 ${
                                result.type === "note"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-[#F47768]/10 text-[#F47768]"
                              }`}
                            >
                              {result.type === "note" ? (
                                <FileText size={23} />
                              ) : (
                                <BookOpen size={23} />
                              )}
                            </motion.div>

                            {/* RESULT INFORMATION */}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="break-words font-bold text-[#17243D] transition group-hover:text-[#F47768]">
                                  {result.title}
                                </h3>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                                    result.type === "note"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-[#F47768]/10 text-[#F47768]"
                                  }`}
                                >
                                  {result.type === "note"
                                    ? "Note"
                                    : "Knowledge Pack"}
                                </span>
                              </div>

                              <p className="mt-3 break-words text-sm leading-7 text-gray-500">
                                {result.snippet}
                              </p>

                              {result.documentName && (
                                <p className="mt-3 break-all text-xs text-gray-400">
                                  Document: {result.documentName}
                                </p>
                              )}

                              <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                  Relevance:{" "}
                                  {Math.round(result.score * 10) / 10}
                                </span>

                                <span className="flex items-center gap-2 text-xs font-semibold text-[#F47768]">
                                  Open

                                  <motion.span
                                    animate={
                                      shouldReduceMotion
                                        ? undefined
                                        : { x: [0, 3, 0] }
                                    }
                                    transition={{
                                      duration: 1.5,
                                      repeat: shouldReduceMotion ? 0 : Infinity,
                                      repeatDelay: 1,
                                    }}
                                  >
                                    <ArrowRight size={15} />
                                  </motion.span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}

export default SearchPage;