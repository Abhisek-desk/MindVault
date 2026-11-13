import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import JSZip from "jszip";

import { getLocalPackById } from "../../../db/packs.db";

function PackReaderPage() {
  const { packId } = useParams();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const zipRef = useRef<JSZip | null>(null);
  const documentRequestRef = useRef(0);

  const [title, setTitle] = useState("");
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");

  const panelVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  // LOAD DOWNLOADED KNOWLEDGE PACK
  useEffect(() => {
    let cancelled = false;

    const loadPack = async () => {
      try {
        setLoading(true);
        setError("");

        if (!packId) {
          throw new Error("Knowledge pack ID is missing.");
        }

        const pack = await getLocalPackById(packId);

        if (!pack) {
          throw new Error("This knowledge pack is not downloaded.");
        }

        if (!pack.contentBlob) {
          throw new Error(
            "Downloaded file is not available on this device.",
          );
        }

        const MAX_PACK_SIZE = 50 * 1024 * 1024;

        if (pack.contentBlob.size > MAX_PACK_SIZE) {
          throw new Error(
            "Knowledge pack exceeds the maximum allowed size.",
          );
        }

        const zip = await JSZip.loadAsync(pack.contentBlob, {
          checkCRC32: true,
        });

        const files = Object.values(zip.files)
          .filter(
            (file) =>
              !file.dir && /\.(md|markdown|txt)$/i.test(file.name),
          )
          .map((file) => file.name)
          .sort();

        if (files.length === 0) {
          throw new Error(
            "No readable Markdown or text documents found.",
          );
        }

        const firstFile = zip.file(files[0]);

        if (!firstFile) {
          throw new Error("The first document could not be opened.");
        }

        const firstContent = await firstFile.async("string");

        if (cancelled) return;

        zipRef.current = zip;

        setTitle(pack.title);
        setDocuments(files);
        setSelectedDocument(files[0]);
        setContent(firstContent);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not open this knowledge pack.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPack();

    return () => {
      cancelled = true;
      documentRequestRef.current += 1;
      zipRef.current = null;
    };
  }, [packId]);

  // OPEN SELECTED DOCUMENT
  const handleDocumentSelect = async (fileName: string) => {
    if (fileName === selectedDocument) {
      return;
    }

    const requestId = ++documentRequestRef.current;

    try {
      const zip = zipRef.current;

      if (!zip) {
        throw new Error("Knowledge pack is not loaded.");
      }

      const file = zip.file(fileName);

      if (!file) {
        throw new Error("Document could not be found.");
      }

      setSelectedDocument(fileName);
      setContentLoading(true);
      setError("");
      setContent("");

      const text = await file.async("string");

      if (requestId !== documentRequestRef.current) {
        return;
      }

      setContent(text);
    } catch (err) {
      if (requestId !== documentRequestRef.current) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Could not open document.",
      );
    } finally {
      if (requestId === documentRequestRef.current) {
        setContentLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F1E5] text-[#17243D]">
      {/* HEADER */}
      <motion.header
        initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
        className="sticky top-0 z-10 border-b border-[#17243D]/10 bg-[#FFFAF1] px-5 py-4"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <motion.button
            whileHover={shouldReduceMotion ? undefined : { x: -3 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.94 }}
            onClick={() => navigate("/library")}
            className="rounded-xl border border-[#17243D]/10 p-2 transition hover:bg-[#F8F1E5]"
            aria-label="Back to library"
          >
            <ArrowLeft size={20} />
          </motion.button>

          <div>
            <p className="text-xs font-semibold text-[#F47768]">
              OFFLINE KNOWLEDGE READER
            </p>

            <h1 className="text-lg font-bold">
              {title || "Knowledge Pack"}
            </h1>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl bg-[#FFFAF1] p-12 text-center"
            >
              <Loader2
                size={30}
                className="mx-auto mb-3 animate-spin text-[#F47768]"
              />

              <p>Opening your knowledge pack...</p>
            </motion.div>
          ) : error && documents.length === 0 ? (
            <motion.div
              key="error"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
            >
              <AlertCircle className="mb-3" />

              {error}

              <motion.button
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                onClick={() => navigate("/library")}
                className="mt-5 block rounded-xl bg-[#17243D] px-5 py-2 text-sm font-semibold text-white"
              >
                Return to Library
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="reader"
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.12,
                  },
                },
              }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-4"
            >
              {/* DOCUMENT SIDEBAR */}
              <motion.aside
                variants={shouldReduceMotion ? undefined : panelVariants}
                className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 lg:col-span-1"
              >
                <div className="mb-5 flex items-center gap-2">
                  <BookOpen className="text-[#F47768]" size={21} />

                  <h2 className="font-bold">Contents</h2>
                </div>

                <div className="space-y-2">
                  {documents.map((document) => (
                    <motion.button
                      key={document}
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
                      onClick={() => handleDocumentSelect(document)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                        selectedDocument === document
                          ? "bg-[#17243D] text-white"
                          : "hover:bg-[#F8F1E5]"
                      }`}
                    >
                      <FileText size={17} className="shrink-0" />

                      <span className="break-all">
                        {document.split("/").pop()}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.aside>

              {/* DOCUMENT CONTENT */}
              <motion.section
                variants={shouldReduceMotion ? undefined : panelVariants}
                className="min-h-[500px] rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-6 sm:p-8 lg:col-span-3"
              >
                <div className="mb-6 border-b border-[#17243D]/10 pb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F47768]">
                    Currently Reading
                  </p>

                  <h2 className="mt-2 break-all text-xl font-bold">
                    {selectedDocument.split("/").pop()}
                  </h2>
                </div>

                <AnimatePresence mode="wait">
                  {error && documents.length > 0 ? (
                    <motion.div
                      key="document-error"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                      {error}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {contentLoading ? (
                    <motion.div
                      key="document-loading"
                      initial={shouldReduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-12 text-center"
                    >
                      <Loader2
                        size={28}
                        className="mx-auto mb-3 animate-spin text-[#F47768]"
                      />

                      <p className="text-sm">
                        Loading document...
                      </p>
                    </motion.div>
                  ) : (
                    <motion.pre
                      key={selectedDocument}
                      initial={
                        shouldReduceMotion
                          ? false
                          : { opacity: 0, y: 8 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.22,
                      }}
                      className="whitespace-pre-wrap break-words font-sans text-sm leading-8 text-[#17243D]"
                    >
                      {content}
                    </motion.pre>
                  )}
                </AnimatePresence>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default PackReaderPage;