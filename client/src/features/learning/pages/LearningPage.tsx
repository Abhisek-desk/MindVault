import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  GraduationCap,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";

import Sidebar from "../../dashboard/components/Sidebar";
import DashboardHeader from "../../dashboard/components/DashboardHeader";
import { useNotificationsStore } from "../../../stores/notifications.store";

import { getLocalPacks } from "../../../db/packs.db";

import {
  getAllLearningProgress,
  getLearningProgress,
  startLearning,
  updateLessonProgress,
} from "../../../db/learning.db";

import type {
  LocalLearningProgress,
  LocalPack,
} from "../../../db/database";

import {
  openLearningPack,
  type LearningPackContent,
  type LearningLesson,
} from "../services/learning-content.service";

import { syncLearningProgress } from "../services/learning-progress-sync.service";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// =====================================
// MAIN LEARNING PAGE
// =====================================

function LearningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [packs, setPacks] = useState<LocalPack[]>([]);
  const [progressRecords, setProgressRecords] = useState<
    LocalLearningProgress[]
  >([]);

  const [activeContent, setActiveContent] =
    useState<LearningPackContent | null>(null);

  const [activeProgress, setActiveProgress] =
    useState<LocalLearningProgress | null>(null);

  const [selectedLesson, setSelectedLesson] =
    useState<LearningLesson | null>(null);

  const [lessonContent, setLessonContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [openingPack, setOpeningPack] = useState(false);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  const [error, setError] = useState("");

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // =====================================
  // ONLINE / OFFLINE STATUS
  // =====================================

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // =====================================
  // LOAD LOCAL DATA
  // =====================================

  const loadLocalData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [localPacks, progress] = await Promise.all([
        getLocalPacks(),
        getAllLearningProgress(),
      ]);

      setPacks(localPacks);
      setProgressRecords(progress);
    } catch {
      setError("Unable to load your learning data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLocalData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLocalData]);

  // =====================================
  // OPEN A DOWNLOADED COURSE
  // =====================================

  const openPack = useCallback(
    async (packId: string) => {
      setOpeningPack(true);
      setError("");
      setSelectedLesson(null);
      setLessonContent("");

      try {
        const content = await openLearningPack(packId);

        const progress = await startLearning(
          packId,
          content.lessons.length,
        );

        setActiveContent(content);
        setActiveProgress(progress);

        const savedLesson = content.lessons.find(
          (lesson) => lesson.id === progress.lastLessonId,
        );

        setSelectedLesson(
          savedLesson ?? content.lessons[0] ?? null,
        );

        setSearchParams({ pack: packId });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to open this course.",
        );
      } finally {
        setOpeningPack(false);
      }
    },
    [setSearchParams],
  );

  // =====================================
  // OPEN COURSE FROM URL
  // =====================================

  useEffect(() => {
    const packId = searchParams.get("pack");

    if (!packId || packs.length === 0 || activeContent) {
      return;
    }

    const timer = window.setTimeout(() => {
      const exists = packs.some((pack) => pack.id === packId);

      if (exists) {
        void openPack(packId);
      } else {
        setError("This course is not downloaded on this device.");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [searchParams, packs, activeContent, openPack]);

  // =====================================
  // LOAD SELECTED LESSON
  // =====================================

  useEffect(() => {
    if (!activeContent || !selectedLesson) {
      return;
    }

    let cancelled = false;

    const loadLesson = async () => {
      setLoadingLesson(true);
      setLessonContent("");

      try {
        const content =
          await activeContent.getLessonContent(selectedLesson.id);

        if (!cancelled) {
          setLessonContent(content);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this lesson.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingLesson(false);
        }
      }
    };

    const timer = window.setTimeout(() => {
      void loadLesson();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeContent, selectedLesson]);

  // =====================================
  // REFRESH PROGRESS
  // =====================================

  const refreshProgress = async () => {
    const records = await getAllLearningProgress();

    setProgressRecords(records);

    if (activeContent) {
      const progress = await getLearningProgress(
        activeContent.packId,
      );

      setActiveProgress(progress ?? null);
    }
  };

  // =====================================
  // MARK LESSON COMPLETE / INCOMPLETE
  // =====================================

  const toggleLessonCompletion = async () => {
  if (!activeContent || !activeProgress || !selectedLesson) {
    return;
  }

  setUpdatingProgress(true);
  setError("");

  try {
    const wasCompleted = activeProgress.completedTopics.includes(
      selectedLesson.id,
    );

    const updated = await updateLessonProgress(
      activeContent.packId,
      selectedLesson.id,
      activeContent.lessons.length,
      !wasCompleted,
    );

    setActiveProgress(updated);

    // Notify only when a lesson changes from incomplete to complete.
    if (!wasCompleted) {
      void useNotificationsStore.getState().addNotification({
        title: "Lesson completed",
        message: `You completed "${selectedLesson.title}" in "${activeContent.title}".`,
        category: "learning",
      });
    }

    // Notify only when the course reaches completed status for the first time.
    if (
      !wasCompleted &&
      activeProgress.status !== "completed" &&
      updated.status === "completed"
    ) {
      void useNotificationsStore.getState().addNotification({
        title: "Course completed!",
        message: `Congratulations! You completed the "${activeContent.title}" course.`,
        category: "learning",
      });
    }

    const records = await getAllLearningProgress();

    setProgressRecords(records);

    if (navigator.onLine) {
      void syncLearningProgress();
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to update lesson progress.",
    );
  } finally {
    setUpdatingProgress(false);
  }
};

  // =====================================
  // NAVIGATE BETWEEN LESSONS
  // =====================================

  const navigateLesson = (direction: -1 | 1) => {
    if (!activeContent || !selectedLesson) {
      return;
    }

    const currentIndex = activeContent.lessons.findIndex(
      (lesson) => lesson.id === selectedLesson.id,
    );

    const nextIndex = currentIndex + direction;

    if (
      nextIndex >= 0 &&
      nextIndex < activeContent.lessons.length
    ) {
      setSelectedLesson(activeContent.lessons[nextIndex]);
    }
  };

  // =====================================
  // RETURN TO COURSE LIBRARY
  // =====================================

  const closeCourse = async () => {
    setActiveContent(null);
    setActiveProgress(null);
    setSelectedLesson(null);
    setLessonContent("");
    setError("");

    setSearchParams({});

    await refreshProgress();
  };

  // =====================================
  // PROGRESS HELPERS
  // =====================================

  const getProgressForPack = (packId: string) =>
    progressRecords.find(
      (progress) => progress.packId === packId,
    );

  const completedLessons =
    activeProgress?.completedTopics.length ?? 0;

  const totalLessons =
    activeContent?.lessons.length ?? 0;

  const progressPercentage =
    activeProgress?.progressPercentage ?? 0;

  const currentLessonIndex =
    activeContent && selectedLesson
      ? activeContent.lessons.findIndex(
          (lesson) => lesson.id === selectedLesson.id,
        )
      : -1;

  const currentLessonCompleted =
    activeProgress && selectedLesson
      ? activeProgress.completedTopics.includes(selectedLesson.id)
      : false;

  // =====================================
  // MANUAL SYNC
  // =====================================

  const handleSync = async () => {
    if (!navigator.onLine) {
      return;
    }

    await syncLearningProgress();
    await refreshProgress();
  };

  // =====================================
  // LOADING SCREEN
  // =====================================

  if (loading) {
    return (
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex min-h-screen items-center justify-center bg-[#F8F1E5]"
      >
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2
            size={36}
            className="animate-spin text-[#F47768]"
          />

          <p className="font-medium text-[#17243D]">
            Loading your learning space...
          </p>
        </motion.div>
      </motion.div>
    );
  }

  // =====================================
  // PAGE LAYOUT
  // =====================================

  return (
    <div className="flex min-h-screen bg-[#F8F1E5] text-[#17243D]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">
          {/* PAGE HEADING */}

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#B83E32]">
                <GraduationCap size={18} />
                PERSONAL LEARNING SPACE
              </div>

              <h1 className="text-3xl font-bold md:text-4xl">
                My Learning
              </h1>

              <p className="mt-2 text-sm text-gray-600 md:text-base">
                Learn at your own pace. Your courses work offline.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <motion.div
                key={isOnline ? "online" : "offline"}
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, scale: 0.85 }
                }
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${
                  isOnline
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {isOnline ? (
                  <Wifi size={15} />
                ) : (
                  <WifiOff size={15} />
                )}

                {isOnline ? "Online" : "Offline"}
              </motion.div>

              <motion.button
                whileHover={
                  shouldReduceMotion ? undefined : { y: -2 }
                }
                whileTap={
                  shouldReduceMotion ? undefined : { scale: 0.96 }
                }
                onClick={() => void handleSync()}
                disabled={!isOnline}
                className="flex items-center gap-2 rounded-xl bg-[#17243D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#263958] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <motion.span
                  animate={
                    shouldReduceMotion || !isOnline
                      ? undefined
                      : { rotate: 360 }
                  }
                  transition={{
                    duration: 2,
                    repeat: shouldReduceMotion || !isOnline ? 0 : Infinity,
                    ease: "linear",
                  }}
                >
                  <RefreshCw size={16} />
                </motion.span>
                Sync
              </motion.button>
            </div>
          </motion.div>

          {/* ERROR MESSAGE */}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, y: -8, height: 0 }
                }
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={
                  shouldReduceMotion
                    ? undefined
                    : { opacity: 0, y: -8, height: 0 }
                }
                role="alert"
                className="mb-6 flex items-start justify-between gap-4 overflow-hidden rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <span>{error}</span>

                <button
                  onClick={() => setError("")}
                  className="font-bold"
                  aria-label="Dismiss error"
                >
                  Ã—
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* COURSE READER / COURSE LIBRARY */}

          <AnimatePresence mode="wait">
            {activeContent ? (
              <motion.div
                key="course-reader"
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, y: 16 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={
                  shouldReduceMotion
                    ? undefined
                    : { opacity: 0, y: -12 }
                }
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.3,
                }}
              >
                <motion.button
                  whileHover={
                    shouldReduceMotion ? undefined : { x: -3 }
                  }
                  whileTap={
                    shouldReduceMotion ? undefined : { scale: 0.97 }
                  }
                  onClick={() => void closeCourse()}
                  className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#B83E32] transition hover:gap-3"
                >
                  <ArrowLeft size={17} />
                  Back to My Learning
                </motion.button>

                {/* COURSE OVERVIEW */}

                <motion.div
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, scale: 0.98 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 rounded-2xl bg-[#17243D] p-6 text-white md:p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#F47768]">
                        {activeContent.category}
                      </p>

                      <h2 className="text-2xl font-bold md:text-3xl">
                        {activeContent.title}
                      </h2>

                      <p className="mt-2 max-w-2xl text-sm text-gray-300">
                        {activeContent.description}
                      </p>
                    </div>

                    <motion.div
                      animate={
                        shouldReduceMotion
                          ? undefined
                          : { y: [0, -5, 0] }
                      }
                      transition={{
                        duration: 3,
                        repeat: shouldReduceMotion ? 0 : Infinity,
                      }}
                    >
                      <BookOpen
                        size={42}
                        className="text-[#F47768]"
                      />
                    </motion.div>
                  </div>

                  <div className="mt-7">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-300">
                        Course progress
                      </span>

                      <span className="font-bold">
                        {progressPercentage}%
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                      <motion.div
                        className="h-full rounded-full bg-[#F47768]"
                        initial={
                          shouldReduceMotion
                            ? false
                            : { width: 0 }
                        }
                        animate={{
                          width: `${progressPercentage}%`,
                        }}
                        transition={{
                          duration: shouldReduceMotion ? 0 : 0.8,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-gray-300">
                      {completedLessons} of {totalLessons} lessons completed
                    </p>
                  </div>
                </motion.div>

                <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                  {/* LESSON LIST */}

                  <motion.aside
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, x: -15 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    className="h-fit rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-5"
                  >
                    <h3 className="mb-4 flex items-center gap-2 font-bold">
                      <BookOpen size={18} />
                      Course Lessons
                    </h3>

                    <div className="max-h-[600px] space-y-2 overflow-y-auto">
                      {activeContent.lessons.map((lesson, index) => {
                        const completed =
                          activeProgress?.completedTopics.includes(
                            lesson.id,
                          ) ?? false;

                        const selected =
                          selectedLesson?.id === lesson.id;

                        return (
                          <motion.button
                            key={lesson.id}
                            whileHover={
                              shouldReduceMotion
                                ? undefined
                                : { x: 4 }
                            }
                            whileTap={
                              shouldReduceMotion
                                ? undefined
                                : { scale: 0.98 }
                            }
                            onClick={() => {
                              setSelectedLesson(lesson);
                            }}
                            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                              selected
                                ? "bg-[#17243D] text-white"
                                : "text-[#17243D] hover:bg-[#F8F1E5]"
                            }`}
                          >
                            <motion.span
                              key={completed ? "complete" : "incomplete"}
                              initial={
                                shouldReduceMotion
                                  ? false
                                  : { scale: 0.7 }
                              }
                              animate={{ scale: 1 }}
                            >
                              {completed ? (
                                <CheckCircle2
                                  size={19}
                                  className="shrink-0 text-green-500"
                                />
                              ) : (
                                <Circle
                                  size={19}
                                  className={`shrink-0 ${
                                    selected
                                      ? "text-white/70"
                                      : "text-gray-400"
                                  }`}
                                />
                              )}
                            </motion.span>

                            <span className="min-w-0">
                              <span className="block text-[10px] font-semibold uppercase opacity-60">
                                Lesson {index + 1}
                              </span>

                              <span className="block truncate text-sm font-medium">
                                {lesson.title}
                              </span>
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.aside>

                  {/* LESSON READER */}

                  <motion.section
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, x: 15 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    className="min-w-0 rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-5 md:p-8"
                  >
                    <AnimatePresence mode="wait">
                      {selectedLesson ? (
                        <motion.div
                          key={selectedLesson.id}
                          initial={
                            shouldReduceMotion
                              ? false
                              : { opacity: 0, y: 12 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          exit={
                            shouldReduceMotion
                              ? undefined
                              : { opacity: 0, y: -8 }
                          }
                          transition={{
                            duration: shouldReduceMotion ? 0 : 0.25,
                          }}
                        >
                          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[#17243D]/10 pb-5">
                            <div>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#B83E32]">
                                Lesson {currentLessonIndex + 1} of{" "}
                                {totalLessons}
                              </p>

                              <h3 className="text-2xl font-bold">
                                {selectedLesson.title}
                              </h3>
                            </div>

                            <AnimatePresence>
                              {currentLessonCompleted && (
                                <motion.span
                                  initial={
                                    shouldReduceMotion
                                      ? false
                                      : { opacity: 0, scale: 0.8 }
                                  }
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-2 text-xs font-semibold text-green-700"
                                >
                                  <CheckCircle2 size={15} />
                                  Completed
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>

                          <AnimatePresence mode="wait">
                            {loadingLesson ? (
                              <motion.div
                                key="lesson-loading"
                                initial={
                                  shouldReduceMotion
                                    ? false
                                    : { opacity: 0 }
                                }
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex min-h-64 items-center justify-center"
                              >
                                <Loader2
                                  size={30}
                                  className="animate-spin text-[#F47768]"
                                />
                              </motion.div>
                            ) : (
                              <motion.article
                                key="lesson-content"
                                initial={
                                  shouldReduceMotion
                                    ? false
                                    : { opacity: 0, y: 8 }
                                }
                                animate={{ opacity: 1, y: 0 }}
                                className="min-h-64 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-8 text-gray-700 md:text-base"
                              >
                                {lessonContent}
                              </motion.article>
                            )}
                          </AnimatePresence>

                          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#17243D]/10 pt-6">
                            <motion.button
                              whileHover={
                                shouldReduceMotion
                                  ? undefined
                                  : { x: -3 }
                              }
                              whileTap={
                                shouldReduceMotion
                                  ? undefined
                                  : { scale: 0.96 }
                              }
                              onClick={() => navigateLesson(-1)}
                              disabled={currentLessonIndex <= 0}
                              className="flex items-center gap-2 rounded-xl border border-[#17243D]/15 px-4 py-3 text-sm font-semibold transition hover:bg-[#F8F1E5] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowLeft size={17} />
                              Previous
                            </motion.button>

                            <motion.button
                              whileHover={
                                shouldReduceMotion
                                  ? undefined
                                  : { y: -2, scale: 1.02 }
                              }
                              whileTap={
                                shouldReduceMotion
                                  ? undefined
                                  : { scale: 0.96 }
                              }
                              onClick={() =>
                                void toggleLessonCompletion()
                              }
                              disabled={
                                updatingProgress || loadingLesson
                              }
                              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${
                                currentLessonCompleted
                                  ? "bg-green-700 hover:bg-green-800"
                                  : "bg-[#F47768] hover:bg-[#DC6557]"
                              }`}
                            >
                              {updatingProgress ? (
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <CheckCircle2 size={17} />
                              )}

                              {currentLessonCompleted
                                ? "Mark Incomplete"
                                : "Mark Complete"}
                            </motion.button>

                            <motion.button
                              whileHover={
                                shouldReduceMotion
                                  ? undefined
                                  : { x: 3 }
                              }
                              whileTap={
                                shouldReduceMotion
                                  ? undefined
                                  : { scale: 0.96 }
                              }
                              onClick={() => navigateLesson(1)}
                              disabled={
                                currentLessonIndex >= totalLessons - 1
                              }
                              className="flex items-center gap-2 rounded-xl border border-[#17243D]/15 px-4 py-3 text-sm font-semibold transition hover:bg-[#F8F1E5] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Next
                              <ArrowRight size={17} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="no-lesson"
                          initial={
                            shouldReduceMotion
                              ? false
                              : { opacity: 0 }
                          }
                          animate={{ opacity: 1 }}
                          className="flex min-h-64 items-center justify-center text-gray-500"
                        >
                          Select a lesson to begin.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="course-library"
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, y: 14 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={
                  shouldReduceMotion
                    ? undefined
                    : { opacity: 0, y: -10 }
                }
              >
                {/* LEARNING STATISTICS */}

                <motion.div
                  variants={
                    shouldReduceMotion ? undefined : containerVariants
                  }
                  initial={
                    shouldReduceMotion ? false : "hidden"
                  }
                  animate="visible"
                  className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                  {[
                    {
                      label: "Downloaded Courses",
                      value: packs.length,
                      icon: <BookOpen size={22} />,
                      iconClass: "bg-blue-100 text-blue-700",
                    },
                    {
                      label: "Completed Courses",
                      value: progressRecords.filter(
                        (progress) => progress.status === "completed",
                      ).length,
                      icon: <CheckCircle2 size={22} />,
                      iconClass: "bg-green-100 text-green-700",
                    },
                    {
                      label: "Courses In Progress",
                      value: progressRecords.filter(
                        (progress) => progress.status === "in-progress",
                      ).length,
                      icon: <Clock size={22} />,
                      iconClass: "bg-orange-100 text-orange-700",
                    },
                    {
                      label: "Lessons Completed",
                      value: progressRecords.reduce(
                        (total, progress) =>
                          total + progress.completedTopics.length,
                        0,
                      ),
                      icon: <GraduationCap size={22} />,
                      iconClass: "bg-purple-100 text-purple-700",
                    },
                  ].map((stat) => (
                    <motion.div
                      key={stat.label}
                      variants={
                        shouldReduceMotion ? undefined : itemVariants
                      }
                      whileHover={
                        shouldReduceMotion
                          ? undefined
                          : { y: -4 }
                      }
                      className="rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-5"
                    >
                      <div
                        className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconClass}`}
                      >
                        {stat.icon}
                      </div>

                      <p className="text-sm text-gray-500">
                        {stat.label}
                      </p>

                      <motion.p
                        key={stat.value}
                        initial={
                          shouldReduceMotion
                            ? false
                            : { opacity: 0, y: 8 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-3xl font-bold"
                      >
                        {stat.value}
                      </motion.p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* DOWNLOADED COURSES */}

                <motion.div
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 12 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-center justify-between gap-3"
                >
                  <div>
                    <h2 className="text-xl font-bold">
                      Your Courses
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Choose a downloaded course to continue learning.
                    </p>
                  </div>

                  <motion.button
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : { rotate: 45, scale: 1.08 }
                    }
                    whileTap={
                      shouldReduceMotion
                        ? undefined
                        : { scale: 0.9 }
                    }
                    onClick={() => void loadLocalData()}
                    className="rounded-xl p-2 text-[#17243D] transition hover:bg-[#FFFAF1]"
                    title="Refresh courses"
                    aria-label="Refresh courses"
                  >
                    <RefreshCw size={19} />
                  </motion.button>
                </motion.div>

                <AnimatePresence mode="wait">
                  {packs.length === 0 ? (
                    <motion.div
                      key="empty-courses"
                      initial={
                        shouldReduceMotion
                          ? false
                          : { opacity: 0, y: 15 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border-2 border-dashed border-[#17243D]/20 bg-[#FFFAF1] px-6 py-16 text-center"
                    >
                      <motion.div
                        animate={
                          shouldReduceMotion
                            ? undefined
                            : { y: [0, -6, 0] }
                        }
                        transition={{
                          duration: 2.5,
                          repeat: shouldReduceMotion ? 0 : Infinity,
                        }}
                      >
                        <GraduationCap
                          size={48}
                          className="mx-auto mb-4 text-[#F47768]"
                        />
                      </motion.div>

                      <h3 className="text-xl font-bold">
                        No downloaded courses yet
                      </h3>

                      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                        Visit My Library and download a knowledge pack.
                        Your downloaded courses will appear here and remain
                        accessible offline.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="course-cards"
                      variants={
                        shouldReduceMotion ? undefined : containerVariants
                      }
                      initial={
                        shouldReduceMotion ? false : "hidden"
                      }
                      animate="visible"
                      className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
                    >
                      {packs.map((pack) => {
                        const progress = getProgressForPack(pack.id);

                        const percentage =
                          progress?.progressPercentage ?? 0;

                        return (
                          <motion.article
                            key={pack.id}
                            variants={
                              shouldReduceMotion
                                ? undefined
                                : itemVariants
                            }
                            whileHover={
                              shouldReduceMotion
                                ? undefined
                                : { y: -5, scale: 1.01 }
                            }
                            className="group overflow-hidden rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] transition duration-300 hover:shadow-xl"
                          >
                            <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#17243D] to-[#354D72]">
                              <motion.div
                                whileHover={
                                  shouldReduceMotion
                                    ? undefined
                                    : { scale: 1.15, rotate: -5 }
                                }
                                transition={{ duration: 0.25 }}
                              >
                                <GraduationCap
                                  size={55}
                                  className="text-[#F47768]"
                                />
                              </motion.div>
                            </div>

                            <div className="p-5">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="rounded-full bg-[#F47768]/10 px-3 py-1 text-xs font-semibold text-[#B83E32]">
                                  {pack.category}
                                </span>

                                <span className="text-xs text-gray-500">
                                  {pack.language}
                                </span>
                              </div>

                              <h3 className="text-lg font-bold">
                                {pack.title}
                              </h3>

                              <p className="mt-2 min-h-12 text-sm leading-6 text-gray-500">
                                {pack.description}
                              </p>

                              <div className="mt-5">
                                <div className="mb-2 flex justify-between text-xs">
                                  <span className="text-gray-500">
                                    Your progress
                                  </span>

                                  <span className="font-bold">
                                    {percentage}%
                                  </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-[#17243D]/10">
                                  <motion.div
                                    className="h-full rounded-full bg-[#F47768]"
                                    initial={
                                      shouldReduceMotion
                                        ? false
                                        : { width: 0 }
                                    }
                                    animate={{
                                      width: `${percentage}%`,
                                    }}
                                    transition={{
                                      duration: shouldReduceMotion
                                        ? 0
                                        : 0.7,
                                    }}
                                  />
                                </div>

                                <p className="mt-2 text-xs text-gray-500">
                                  {progress?.completedTopics.length ?? 0}{" "}
                                  lessons completed
                                </p>
                              </div>

                              <motion.button
                                whileHover={
                                  shouldReduceMotion
                                    ? undefined
                                    : { y: -2 }
                                }
                                whileTap={
                                  shouldReduceMotion
                                    ? undefined
                                    : { scale: 0.97 }
                                }
                                onClick={() => void openPack(pack.id)}
                                disabled={openingPack}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17243D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#263958] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {openingPack ? (
                                  <Loader2
                                    size={17}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <BookOpen size={17} />
                                )}

                                {percentage > 0
                                  ? "Continue Learning"
                                  : "Start Learning"}
                              </motion.button>
                            </div>
                          </motion.article>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default LearningPage;