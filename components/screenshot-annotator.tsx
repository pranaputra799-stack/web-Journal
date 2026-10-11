"use client";

import { useEffect, useRef, useState } from "react";
import { uploadScreenshot } from "@/app/actions/trades";

export type ToolType = "select" | "crop" | "arrow" | "rect" | "line" | "pen" | "text";

export interface AnnotationItem {
  id: string;
  type: "arrow" | "rect" | "line" | "pen" | "text";
  color: string;
  strokeWidth: number;
  points?: Array<{ x: number; y: number }>;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  text?: string;
}

export interface ScreenshotAnnotatorProps {
  tradeId?: string;
  initialImageUrl?: string;
  onUploaded?: () => void;
  onClose?: () => void;
}

const COLORS = [
  { name: "Brass", hex: "#d9a441" },
  { name: "Profit", hex: "#3fb27f" },
  { name: "Loss", hex: "#e0574a" },
  { name: "Cyan", hex: "#38bdf8" },
  { name: "White", hex: "#ffffff" },
];

export function ScreenshotAnnotator({
  tradeId,
  initialImageUrl,
  onUploaded,
  onClose,
}: ScreenshotAnnotatorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageUrl ?? null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>("arrow");
  const [color, setColor] = useState<string>("#d9a441");
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [positionLabel, setPositionLabel] = useState<string>("sesudah");
  const [caption, setCaption] = useState<string>("");

  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationItem[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<AnnotationItem | null>(null);

  // Manual Crop Rect (in image pixel space)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      setImgElement(img);
      setCropBox({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
    };
  }, [imageSrc]);

  // Listen for Ctrl+V paste anywhere
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const url = URL.createObjectURL(file);
            setImageSrc(url);
            setAnnotations([]);
            setRedoStack([]);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Redraw canvas on changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;

    // Draw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgElement, 0, 0);

    // Draw all completed annotations
    const all = [...annotations, ...(currentAnnotation ? [currentAnnotation] : [])];
    for (const ann of all) {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.type === "pen" && ann.points && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
      } else if (ann.type === "line" && ann.startX !== undefined && ann.endX !== undefined) {
        ctx.beginPath();
        ctx.moveTo(ann.startX, ann.startY!);
        ctx.lineTo(ann.endX, ann.endY!);
        ctx.stroke();
      } else if (ann.type === "rect" && ann.startX !== undefined && ann.endX !== undefined) {
        const x = Math.min(ann.startX, ann.endX);
        const y = Math.min(ann.startY!, ann.endY!);
        const w = Math.abs(ann.endX - ann.startX);
        const h = Math.abs(ann.endY! - ann.startY!);
        ctx.strokeRect(x, y, w, h);
        // Subtle fill for zones
        ctx.globalAlpha = 0.12;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1.0;
      } else if (ann.type === "arrow" && ann.startX !== undefined && ann.endX !== undefined) {
        drawArrow(ctx, ann.startX, ann.startY!, ann.endX, ann.endY!, ann.strokeWidth);
      } else if (ann.type === "text" && ann.startX !== undefined && ann.text) {
        ctx.font = `bold ${Math.max(16, ann.strokeWidth * 6)}px monospace`;
        // Text background badge for readability
        const metrics = ctx.measureText(ann.text);
        const pad = 6;
        const th = Math.max(16, ann.strokeWidth * 6);
        ctx.fillStyle = "rgba(18, 21, 26, 0.85)";
        ctx.fillRect(ann.startX - pad, ann.startY! - th - pad, metrics.width + pad * 2, th + pad * 2);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(ann.startX - pad, ann.startY! - th - pad, metrics.width + pad * 2, th + pad * 2);
        // Draw text
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, ann.startX, ann.startY!);
      }
    }
  }, [imgElement, annotations, currentAnnotation]);

  // Arrow drawing helper
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    width: number,
  ) => {
    const headlen = Math.max(14, width * 4.5);
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  // Auto-Crop: Detect uniform border margins (e.g. black bars or window margins)
  const handleAutoCrop = () => {
    if (!imgElement) return;
    const canvas = document.createElement("canvas");
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgElement, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const w = canvas.width;
    const h = canvas.height;

    // Sample top-left corner color as baseline margin color
    const r0 = data[0];
    const g0 = data[1];
    const b0 = data[2];

    const isMargin = (x: number, y: number) => {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const diff = Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0);
      return diff < 28; // Tolerance threshold
    };

    let top = 0;
    while (top < h - 50) {
      let uniform = true;
      for (let x = 0; x < w; x += 15) {
        if (!isMargin(x, top)) {
          uniform = false;
          break;
        }
      }
      if (!uniform) break;
      top++;
    }

    let bottom = h - 1;
    while (bottom > top + 50) {
      let uniform = true;
      for (let x = 0; x < w; x += 15) {
        if (!isMargin(x, bottom)) {
          uniform = false;
          break;
        }
      }
      if (!uniform) break;
      bottom--;
    }

    let left = 0;
    while (left < w - 50) {
      let uniform = true;
      for (let y = top; y <= bottom; y += 15) {
        if (!isMargin(left, y)) {
          uniform = false;
          break;
        }
      }
      if (!uniform) break;
      left++;
    }

    let right = w - 1;
    while (right > left + 50) {
      let uniform = true;
      for (let y = top; y <= bottom; y += 15) {
        if (!isMargin(right, y)) {
          uniform = false;
          break;
        }
      }
      if (!uniform) break;
      right--;
    }

    const cropW = right - left + 1;
    const cropH = bottom - top + 1;

    // Apply auto crop directly
    applyCropRect(left, top, cropW, cropH);
  };

  const applyCropRect = (x: number, y: number, w: number, h: number) => {
    if (!imgElement || w < 20 || h < 20) return;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tctx = tempCanvas.getContext("2d");
    if (!tctx) return;

    tctx.drawImage(imgElement, x, y, w, h, 0, 0, w, h);
    const croppedUrl = tempCanvas.toDataURL("image/png");
    setImageSrc(croppedUrl);
    setAnnotations([]);
    setRedoStack([]);
  };

  // Convert mouse event coordinates to canvas space
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Pointer interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imgElement) return;
    const { x, y } = getCanvasCoords(e);

    if (activeTool === "text") {
      const promptText = window.prompt("Tulis catatan anotasi chart (contoh: Entry M5 / BOS / SL Hit):");
      if (promptText && promptText.trim()) {
        const item: AnnotationItem = {
          id: String(Date.now()),
          type: "text",
          color,
          strokeWidth,
          startX: x,
          startY: y,
          text: promptText.trim(),
        };
        setAnnotations((prev) => [...prev, item]);
        setRedoStack([]);
      }
      return;
    }

    setIsDrawing(true);
    if (activeTool === "pen") {
      setCurrentAnnotation({
        id: String(Date.now()),
        type: "pen",
        color,
        strokeWidth,
        points: [{ x, y }],
      });
    } else if (activeTool === "arrow" || activeTool === "rect" || activeTool === "line") {
      setCurrentAnnotation({
        id: String(Date.now()),
        type: activeTool,
        color,
        strokeWidth,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;
    const { x, y } = getCanvasCoords(e);

    if (currentAnnotation.type === "pen") {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...(currentAnnotation.points ?? []), { x, y }],
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        endX: x,
        endY: y,
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentAnnotation) return;
    setIsDrawing(false);
    setAnnotations((prev) => [...prev, currentAnnotation]);
    setCurrentAnnotation(null);
    setRedoStack([]);
  };

  // Undo & Redo
  const handleUndo = () => {
    if (annotations.length === 0) return;
    const last = annotations[annotations.length - 1];
    setAnnotations((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [[last], ...prev]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [toRestore, ...rest] = redoStack;
    setAnnotations((prev) => [...prev, ...toRestore]);
    setRedoStack(rest);
  };

  const handleClear = () => {
    if (annotations.length === 0) return;
    if (window.confirm("Hapus semua coretan / anotasi?")) {
      setAnnotations([]);
      setRedoStack([]);
    }
  };

  // Export & Upload
  const handleUploadOrSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      if (!tradeId) {
        // Download directly if no tradeId provided
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `chart-annotated-${Date.now()}.png`;
        a.click();
        return;
      }

      setIsUploading(true);
      setErrorMessage(null);

      try {
        const file = new File([blob], `annotated-${Date.now()}.png`, { type: "image/png" });
        const formData = new FormData();
        formData.append("trade_id", tradeId);
        formData.append("file", file);
        formData.append("position", positionLabel);
        formData.append("caption", caption || "Chart screenshot dengan anotasi");

        await uploadScreenshot(formData);
        setUploadSuccess(true);
        if (onUploaded) onUploaded();
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Gagal mengunggah screenshot.");
      } finally {
        setIsUploading(false);
      }
    }, "image/png");
  };

  return (
    <div className="panel-surface border border-line p-4 md:p-6 shadow-2xl rounded-sm">
      {/* Top Bar: Title & Close */}
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <div>
          <h2 className="text-base font-semibold text-paper flex items-center gap-2">
            <span>Screenshot Auto-Crop & Annotation</span>
            <span className="num text-[10px] rounded bg-brass/10 border border-brass/30 px-1.5 py-0.5 text-brass">
              Studio Chart
            </span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Crop otomatis margin hitam/kosong, tambahkan panah entry, zona box FVG/OB, atau teks catatan.
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-paper px-2 py-1 border border-line"
          >
            ✕ Tutup
          </button>
        )}
      </div>

      {!imageSrc ? (
        // Empty Dropzone / Paste Area
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith("image/")) {
              setImageSrc(URL.createObjectURL(file));
            }
          }}
          className="flex flex-col items-center justify-center border-2 border-dashed border-line hover:border-brass/50 rounded p-10 text-center transition-colors bg-raised/20"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-brass text-2xl font-bold">
            📷
          </div>
          <h3 className="text-sm font-semibold text-paper">
            Tempel Screenshot (Ctrl + V) atau Tarik Berkas ke Sini
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted">
            Tekan <kbd className="border border-line bg-raised px-1 py-0.5 text-brass">Ctrl+V</kbd> langsung
            setelah mengambil screenshot chart TradingView / MetaTrader.
          </p>

          <label className="mt-4 cursor-pointer border border-brass px-4 py-2 text-xs font-semibold text-brass hover:bg-brass/5 transition-colors">
            Pilih dari Komputer
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setImageSrc(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>
      ) : (
        // Active Studio Editor
        <div className="space-y-4">
          {/* Toolbar: Tools, Colors, Auto-crop, Undo */}
          <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-ink/70 p-2.5 rounded">
            {/* Annotation Tools */}
            <div className="flex flex-wrap items-center gap-1 border-r border-line pr-2">
              <button
                type="button"
                onClick={() => setActiveTool("arrow")}
                className={`num px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTool === "arrow" ? "bg-raised text-brass font-bold" : "text-muted hover:text-paper"
                }`}
                title="Panah Entry / Arah"
              >
                ↗ Panah
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("rect")}
                className={`num px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTool === "rect" ? "bg-raised text-brass font-bold" : "text-muted hover:text-paper"
                }`}
                title="Kotak Zona / Order Block"
              >
                ▢ Kotak Zona
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("line")}
                className={`num px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTool === "line" ? "bg-raised text-brass font-bold" : "text-muted hover:text-paper"
                }`}
                title="Garis Trendline / Level"
              >
                ╱ Garis
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("pen")}
                className={`num px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTool === "pen" ? "bg-raised text-brass font-bold" : "text-muted hover:text-paper"
                }`}
                title="Coretan Bebas (Pen)"
              >
                ✎ Pen
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("text")}
                className={`num px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTool === "text" ? "bg-raised text-brass font-bold" : "text-muted hover:text-paper"
                }`}
                title="Tulis Teks Catatan"
              >
                🆎 Teks
              </button>
            </div>

            {/* Colors & Width */}
            <div className="flex items-center gap-2 border-r border-line pr-2">
              <span className="text-[10px] text-muted uppercase">Warna:</span>
              <div className="flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      color === c.hex ? "scale-125 border-white ring-2 ring-brass" : "border-line"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>

              <select
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="num bg-raised border border-line text-xs py-1 px-1.5 ml-2 text-paper"
                title="Ketebalan Garis"
              >
                <option value={2}>Tipis (2px)</option>
                <option value={3}>Sedang (3px)</option>
                <option value={5}>Tebal (5px)</option>
                <option value={8}>Ekstra (8px)</option>
              </select>
            </div>

            {/* Auto-Crop & Undo Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoCrop}
                className="num border border-brass/60 bg-brass/10 px-2.5 py-1 text-xs font-medium text-brass hover:bg-brass/20 transition-colors"
                title="Potong otomatis margin hitam/bingkai kosong"
              >
                ✂ Auto-Crop Margin
              </button>

              <button
                type="button"
                onClick={handleUndo}
                disabled={annotations.length === 0}
                className="num border border-line px-2 py-1 text-xs text-muted hover:text-paper disabled:opacity-40"
                title="Undo (Kembalikan)"
              >
                ↩ Undo
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="num border border-line px-2 py-1 text-xs text-muted hover:text-paper disabled:opacity-40"
                title="Redo"
              >
                ↪ Redo
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={annotations.length === 0}
                className="num border border-line px-2 py-1 text-xs text-muted hover:text-loss disabled:opacity-40"
                title="Hapus Semua Coretan"
              >
                Hapus Coretan
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            ref={containerRef}
            className="relative flex items-center justify-center overflow-auto rounded border border-line bg-ink/90 p-2 max-h-[520px]"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="max-h-[500px] w-auto max-w-full cursor-crosshair border border-line shadow-lg"
            />
          </div>

          {/* Metadata & Save / Upload Footer */}
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line/60 pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="block">
                <span className="num block text-[10px] text-muted uppercase">Posisi / Label</span>
                <select
                  value={positionLabel}
                  onChange={(e) => setPositionLabel(e.target.value)}
                  className="num mt-1 bg-raised border border-line px-2.5 py-1.5 text-xs text-paper"
                >
                  <option value="sebelum">Sebelum Entry</option>
                  <option value="sesudah">Sesudah (Hasil)</option>
                  <option value="htf">HTF (Analisis Multi-TF)</option>
                </select>
              </label>

              <label className="block sm:w-64">
                <span className="num block text-[10px] text-muted uppercase">Keterangan Singkat</span>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Misal: Entry M5 konfirmasi CHoCH"
                  className="num mt-1 w-full bg-raised border border-line px-2.5 py-1.5 text-xs text-paper placeholder:text-muted/60"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  setAnnotations([]);
                }}
                className="num border border-line px-3 py-2 text-xs text-muted hover:text-paper"
              >
                Ganti Gambar
              </button>

              <button
                type="button"
                onClick={handleUploadOrSave}
                disabled={isUploading}
                className="num border border-brass bg-brass text-brass-ink px-4 py-2 text-xs font-semibold hover:bg-brass/90 transition-colors disabled:opacity-50"
              >
                {isUploading
                  ? "Mengunggah..."
                  : tradeId
                    ? "Unggah ke Trade"
                    : "Unduh Gambar PNG"}
              </button>
            </div>
          </div>

          {/* Messages */}
          {uploadSuccess && (
            <p className="num text-xs text-profit font-medium">
              ✓ Screenshot berhasil disimpan dan diunggah ke trade!
            </p>
          )}
          {errorMessage && (
            <p className="num text-xs text-loss font-medium">
              ✕ {errorMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
