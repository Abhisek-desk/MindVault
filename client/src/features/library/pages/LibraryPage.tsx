import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Download,
  CheckCircle2,
  Search,
  RefreshCw,
  Trash2,
  HardDrive,
  AlertCircle
} from "lucide-react";

import Sidebar from "../../../features/dashboard/components/Sidebar";
import DashboardHeader from "../../../features/dashboard/components/DashboardHeader";

import {
  getKnowledgePacks,
  downloadKnowledgePack,
  removeDownloadedPack,
  type KnowledgePack
} from "../../../services/download.service";

import {
  getLocalPacks
} from "../../../db/packs.db";

import type { LocalPack } from "../../../db/database";

const categories = [
  "All",
  "Programming",
  "Web Development",
  "Computer Science",
  "Data Structures"
];

const languages = ["All", "English", "Hindi"];

function LibraryPage() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [packs, setPacks] = useState<KnowledgePack[]>([]);
  const [localPacks, setLocalPacks] = useState<LocalPack[]>([]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [language, setLanguage] = useState("All");

  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const downloadedIds = new Set(localPacks.map((pack) => pack.id));

  // LOAD KNOWLEDGE PACKS
  const loadPacks = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getKnowledgePacks({
        search: search || undefined,
        category: category === "All" ? undefined : category,
        language: language === "All" ? undefined : language,
        page: 1,
        limit: 50
      });

      setPacks(response.packs);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load knowledge packs."
      );
    } finally {
      setLoading(false);
    }
  };

  // LOAD LOCALLY DOWNLOADED PACKS
  const loadLocalPacks = async () => {
    try {
      const savedPacks = await getLocalPacks();
      setLocalPacks(savedPacks);
    } catch {
      setError("Could not load your downloaded packs.");
    }
  };

  useEffect(() => {
    void loadLocalPacks();
  }, []);

  useEffect(() => {
    void loadPacks();
  }, [search, category, language]);

  // DOWNLOAD A PACK
  const handleDownload = async (pack: KnowledgePack) => {
    try {
      setDownloadingId(pack._id);
      setError("");
      setSuccess("");

      await downloadKnowledgePack(pack);

      await loadLocalPacks();

      setSuccess(`${pack.title} downloaded successfully.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Download failed."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // DELETE A DOWNLOADED PACK
  const handleRemove = async (pack: LocalPack) => {
    const confirmed = window.confirm(
      `Remove "${pack.title}" from your device?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await removeDownloadedPack(pack.id);
      await loadLocalPacks();

      setSuccess(`${pack.title} removed from your device.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove downloaded pack."
      );
    }
  };

  // FORMAT FILE SIZE
  const formatFileSize = (bytes: number) => {
    if (!bytes) return "Unknown size";

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // REFRESH LIBRARY
  const refreshLibrary = async () => {
    await Promise.all([loadPacks(), loadLocalPacks()]);
  };

  return (
    <div className="flex min-h-screen bg-[#F8F1E5] text-[#17243D]">

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-w-0 flex-1">

        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 md:px-8">

          {/* PAGE TITLE */}

          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

            <div>
              <p className="mb-2 text-sm font-semibold text-[#F47768]">
                KNOWLEDGE LIBRARY
              </p>

              <h1 className="text-3xl font-bold">
                Explore Knowledge
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Discover learning resources and save them for offline access.
              </p>
            </div>

            <button
              onClick={refreshLibrary}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#17243D]/10 bg-[#FFFAF1] px-4 py-3 text-sm font-semibold transition hover:border-[#F47768]"
            >
              <RefreshCw size={17} />
              Refresh Library
            </button>

          </section>

          {/* STATISTICS */}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-2xl bg-[#17243D] p-5 text-white">
              <BookOpen className="mb-4 text-[#F47768]" size={25} />

              <p className="text-3xl font-bold">
                {packs.length}
              </p>

              <p className="mt-1 text-sm text-gray-300">
                Available Packs
              </p>
            </div>

            <div className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5">
              <CheckCircle2 className="mb-4 text-green-600" size={25} />

              <p className="text-3xl font-bold">
                {localPacks.length}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Downloaded Packs
              </p>
            </div>

            <div className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5">
              <HardDrive className="mb-4 text-[#F47768]" size={25} />

              <p className="text-3xl font-bold">
                {formatFileSize(
                  localPacks.reduce(
                    (total, pack) => total + (pack.fileSizeBytes || 0),
                    0
                  )
                )}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Downloaded File Size
              </p>
            </div>

          </section>

          {/* NOTIFICATIONS */}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
              {success}
            </div>
          )}

          {/* FILTERS */}

          <section className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5">

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <div className="relative">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search knowledge packs..."
                  className="w-full rounded-xl border border-[#17243D]/10 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#F47768]"
                />
              </div>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-xl border border-[#17243D]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#F47768]"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? "All Categories" : item}
                  </option>
                ))}
              </select>

              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded-xl border border-[#17243D]/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#F47768]"
              >
                {languages.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? "All Languages" : item}
                  </option>
                ))}
              </select>

            </div>

          </section>

          {/* AVAILABLE KNOWLEDGE PACKS */}

          <section>

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Available Knowledge Packs
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Find something interesting to learn.
                </p>
              </div>

              <span className="rounded-full bg-[#F47768]/10 px-3 py-1 text-xs font-semibold text-[#F47768]">
                {packs.length} packs
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-[#FFFAF1] p-12 text-center">
                <RefreshCw
                  size={28}
                  className="mx-auto mb-3 animate-spin text-[#F47768]"
                />

                <p className="text-sm text-gray-500">
                  Loading knowledge packs...
                </p>
              </div>
            ) : packs.length === 0 ? (
              <div className="rounded-2xl bg-[#FFFAF1] p-12 text-center">
                <BookOpen
                  size={35}
                  className="mx-auto mb-3 text-gray-400"
                />

                <h3 className="font-semibold">
                  No knowledge packs found
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Try changing your search or filters.
                </p>
              </div>
            ) : (

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

                {packs.map((pack) => {
                  const isDownloaded = downloadedIds.has(pack._id);
                  const isDownloading = downloadingId === pack._id;

                  return (
                    <article
                      key={pack._id}
                      className="flex flex-col rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >

                      <div className="mb-5 flex items-start justify-between">

                        <div className="rounded-xl bg-[#F47768]/10 p-3 text-[#F47768]">
                          <BookOpen size={25} />
                        </div>

                        {isDownloaded && (
                          <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            <CheckCircle2 size={13} />
                            Downloaded
                          </span>
                        )}

                      </div>

                      <div className="flex-1">

                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#F47768]">
                          {pack.category}
                        </p>

                        <h3 className="text-lg font-bold">
                          {pack.title}
                        </h3>

                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-500">
                          {pack.description}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">

                          <span className="rounded-lg bg-[#F8F1E5] px-3 py-1 text-xs text-gray-600">
                            {pack.language}
                          </span>

                          <span className="rounded-lg bg-[#F8F1E5] px-3 py-1 text-xs text-gray-600">
                            Version {pack.version}
                          </span>

                        </div>

                        <p className="mt-4 text-xs text-gray-400">
                          File size: {formatFileSize(pack.fileSizeBytes)}
                        </p>

                      </div>

                      <button
                        disabled={isDownloaded || isDownloading}
                        onClick={() => handleDownload(pack)}
                        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                          isDownloaded
                            ? "cursor-not-allowed bg-green-100 text-green-700"
                            : "bg-[#17243D] text-white hover:bg-[#F47768] disabled:opacity-60"
                        }`}
                      >

                        {isDownloaded ? (
                          <>
                            <CheckCircle2 size={17} />
                            Saved Offline
                          </>
                        ) : isDownloading ? (
                          <>
                            <RefreshCw size={17} className="animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download size={17} />
                            Download Pack
                          </>
                        )}

                      </button>

                    </article>
                  );
                })}

              </div>
            )}

          </section>

          {/* DOWNLOADED KNOWLEDGE PACKS */}

          <section>

            <div className="mb-5">
              <h2 className="text-xl font-bold">
                My Offline Library
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Knowledge packs stored on this device.
              </p>
            </div>

            {localPacks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#17243D]/20 bg-[#FFFAF1] p-10 text-center">

                <HardDrive
                  size={35}
                  className="mx-auto mb-3 text-gray-400"
                />

                <h3 className="font-semibold">
                  Your offline library is empty
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Download a knowledge pack to access it without internet.
                </p>

              </div>
            ) : (

              <div className="space-y-3">

                {localPacks.map((pack) => (

                  <div
                    key={pack.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 sm:flex-row sm:items-center"
                  >

                    <div className="flex items-center gap-4">

                      <div className="rounded-xl bg-green-100 p-3 text-green-700">
                        <BookOpen size={22} />
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          {pack.title}
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          {pack.category} · {pack.language} ·{" "}
                          {formatFileSize(pack.fileSizeBytes)}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Saved on{" "}
                          {new Date(pack.downloadedAt).toLocaleDateString()}
                        </p>
                      </div>

                    </div>

                    {/* PACK ACTIONS */}

                    <div className="flex flex-wrap gap-2">

                      <button
                        onClick={() => navigate(`/library/read/${pack.id}`)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-[#17243D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#F47768]"
                      >
                        <BookOpen size={16} />
                        Open Pack
                      </button>

                      <button
                        onClick={() => handleRemove(pack)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>

                    </div>

                  </div>

                ))}

              </div>
            )}

          </section>

        </div>

      </main>

    </div>
  );
}

export default LibraryPage;