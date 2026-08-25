import { useEffect } from "react";

const ImageModal = ({ isOpen, onClose, imageUrl, altText = "Image preview" }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md transition-all animate-fadeIn"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] flex flex-col items-center">
        {/* Top Controls */}
        <div
          className="absolute -top-12 right-0 flex items-center gap-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-sm hover:bg-zinc-700 hover:text-white transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download / Full Size
          </a>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Image Content */}
        <div
          className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/50 shadow-2xl backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={altText}
            className="max-h-[82vh] max-w-[88vw] object-contain rounded-xl select-none"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
