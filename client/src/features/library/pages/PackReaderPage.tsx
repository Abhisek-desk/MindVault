import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react";
import JSZip from "jszip";

import { getLocalPackById } from "../../../db/packs.db";

function PackReaderPage() {
  const { packId } = useParams();
  const navigate = useNavigate();

  const zipRef = useRef<JSZip | null>(null);

  const [title, setTitle] = useState("");
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");

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
          throw new Error(
            "This knowledge pack is not downloaded."
          );
        }

        if (!pack.contentBlob) {
          throw new Error(
            "Downloaded file is not available on this device."
          );
        }

        const zip = await JSZip.loadAsync(pack.contentBlob);

        const files = Object.values(zip.files)
          .filter(
            (file) =>
              !file.dir &&
              /\.(md|markdown|txt)$/i.test(file.name)
          )
          .map((file) => file.name)
          .sort();

        if (files.length === 0) {
          throw new Error(
            "No readable Markdown or text documents found."
          );
        }

        const firstFile = zip.file(files[0]);

        if (!firstFile) {
          throw new Error(
            "The first document could not be opened."
          );
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
            : "Could not open this knowledge pack."
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
      zipRef.current = null;
    };
  }, [packId]);

  // OPEN SELECTED DOCUMENT
  const handleDocumentSelect = async (fileName: string) => {
    try {
      const zip = zipRef.current;

      if (!zip) {
        throw new Error(
          "Knowledge pack is not loaded."
        );
      }

      setSelectedDocument(fileName);
      setContentLoading(true);
      setError("");
      setContent("");

      const file = zip.file(fileName);

      if (!file) {
        throw new Error(
          "Document could not be found."
        );
      }

      const text = await file.async("string");

      setContent(text);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open document."
      );
    } finally {
      setContentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F1E5] text-[#17243D]">

      {/* HEADER */}
      <header className="sticky top-0 z-10 border-b border-[#17243D]/10 bg-[#FFFAF1] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-4">

          <button
            onClick={() => navigate("/library")}
            className="rounded-xl border border-[#17243D]/10 p-2 transition hover:bg-[#F8F1E5]"
            aria-label="Back to library"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <p className="text-xs font-semibold text-[#F47768]">
              OFFLINE KNOWLEDGE READER
            </p>

            <h1 className="text-lg font-bold">
              {title || "Knowledge Pack"}
            </h1>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">

        {/* INITIAL LOADING */}
        {loading ? (
          <div className="rounded-2xl bg-[#FFFAF1] p-12 text-center">

            <Loader2
              size={30}
              className="mx-auto mb-3 animate-spin text-[#F47768]"
            />

            <p>Opening your knowledge pack...</p>

          </div>
        ) : error && !zipRef.current ? (
          /* PACK LOADING ERROR */
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">

            <AlertCircle className="mb-3" />

            {error}

            <button
              onClick={() => navigate("/library")}
              className="mt-5 block rounded-xl bg-[#17243D] px-5 py-2 text-sm font-semibold text-white"
            >
              Return to Library
            </button>

          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

            {/* DOCUMENT SIDEBAR */}
            <aside className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 lg:col-span-1">

              <div className="mb-5 flex items-center gap-2">

                <BookOpen
                  className="text-[#F47768]"
                  size={21}
                />

                <h2 className="font-bold">
                  Contents
                </h2>

              </div>

              <div className="space-y-2">

                {documents.map((document) => (
                  <button
                    key={document}
                    onClick={() => handleDocumentSelect(document)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                      selectedDocument === document
                        ? "bg-[#17243D] text-white"
                        : "hover:bg-[#F8F1E5]"
                    }`}
                  >

                    <FileText
                      size={17}
                      className="shrink-0"
                    />

                    <span className="break-all">
                      {document.split("/").pop()}
                    </span>

                  </button>
                ))}

              </div>

            </aside>

            {/* DOCUMENT CONTENT */}
            <section className="min-h-[500px] rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-6 sm:p-8 lg:col-span-3">

              <div className="mb-6 border-b border-[#17243D]/10 pb-4">

                <p className="text-xs font-semibold uppercase tracking-wide text-[#F47768]">
                  Currently Reading
                </p>

                <h2 className="mt-2 break-all text-xl font-bold">
                  {selectedDocument.split("/").pop()}
                </h2>

              </div>

              {error && zipRef.current && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {contentLoading ? (
                <div className="py-12 text-center">

                  <Loader2
                    size={28}
                    className="mx-auto mb-3 animate-spin text-[#F47768]"
                  />

                  <p className="text-sm">
                    Loading document...
                  </p>

                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-8 text-[#17243D]">
                  {content}
                </pre>
              )}

            </section>

          </div>
        )}

      </main>

    </div>
  );
}

export default PackReaderPage;