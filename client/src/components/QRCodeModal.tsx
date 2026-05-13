import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeModalProps {
  url: string;
  open: boolean;
  onClose: () => void;
  pollTitle: string;
}

export function QRCodeModal({ url, open, onClose, pollTitle }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: {
        dark: "#0F172A",
        light: "#FFFFFF",
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [open, url]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `pollflow-qr-${pollTitle
      .slice(0, 20)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs text-center">
        <DialogHeader>
          <DialogTitle className="text-base">Scan to respond</DialogTitle>
          <DialogDescription className="sr-only">
            QR code for {pollTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code for ${pollTitle}`}
              className="rounded-lg border"
              width={240}
              height={240}
            />
          ) : (
            <div className="flex h-60 w-60 items-center justify-center rounded-lg border bg-muted">
              <p className="text-xs text-muted-foreground">Generating…</p>
            </div>
          )}
          <p className="max-w-[200px] text-xs leading-relaxed text-muted-foreground">
            Anyone who scans this goes directly to your poll
          </p>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!qrDataUrl}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
