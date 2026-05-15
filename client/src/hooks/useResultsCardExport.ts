import { useRef, useCallback, useState } from "react";
import { toast } from "sonner";

export function useResultsCardExport(pollTitle: string) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportCard = useCallback(async () => {
    if (!cardRef.current) return;
    if (isExporting) return;

    setIsExporting(true);

    try {
      // Dynamic import — don't load html2canvas until needed
      const html2canvas = (await import("html2canvas")).default;

      // Wait for fonts to finish loading so they render in the canvas
      await document.fonts.ready;

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0A0F0F",
        scale: 2, 
        useCORS: true,
        logging: false,
        // Tell html2canvas to ignore elements we don't want captured
        ignoreElements: (el) => el.hasAttribute("data-html2canvas-ignore"),
        // html2canvas can't parse oklch() color function used by Tailwind v4.
        // parseBackgroundColor always reads documentElement and body backgroundColor
        // even when capturing a child element — override them + neutralize border/outline.
        onclone: (doc: Document) => {
          if (doc.documentElement) {
            (doc.documentElement as HTMLElement).style.backgroundColor = "#0A0F0F";
          }
          if (doc.body) {
            doc.body.style.backgroundColor = "#0A0F0F";
          }
          const style = doc.createElement("style");
          style.textContent = `
            * {
              border-color: transparent !important;
              outline-color: transparent !important;
              text-decoration-color: transparent !important;
              column-rule-color: transparent !important;
            }
          `;
          doc.head.appendChild(style);
        },
      });

      const link = document.createElement("a");
      link.download = `pollflow-results-${pollTitle
        .slice(0, 30)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Results card downloaded!");
    } catch (err) {
      console.error("Failed to export results card:", err);
      toast.error("Failed to generate results card. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [pollTitle, isExporting]);

  return { cardRef, exportCard, isExporting };
}
