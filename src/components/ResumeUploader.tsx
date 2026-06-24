import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { analyzeResume } from "@/lib/api/resume.functions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

// ── pdfjs worker ─────────────────────────────────────────────────────────────
// Lazily initialised the first time we parse a PDF.
// Using import.meta.url so Vite bundles the worker file correctly for the browser.
let pdfWorkerReady = false;
async function initPdfWorker() {
  if (pdfWorkerReady) return;
  const { GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).href;
  pdfWorkerReady = true;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const ALLOWED_MIME = new Set(["application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return `Unsupported file type "${file.type}". Only PDF is accepted.`;
  }
  if (file.size > MAX_BYTES) {
    return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — maximum is 5 MB.`;
  }
  return null;
}

async function extractPdfText(file: File): Promise<string> {
  await initPdfWorker();
  const { getDocument } = await import("pdfjs-dist");
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;

  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item): item is { str: string } => "str" in item)
      .map((item) => item.str)
      .join(" ");
    parts.push(pageText);
  }

  const text = parts.join("\n\n").trim();
  if (text.length < 50) {
    throw new Error(
      "The PDF appears to be image-based or has very little selectable text. " +
        "Please upload a text-based PDF or copy-paste your resume text instead.",
    );
  }
  return text;
}

// ── component ─────────────────────────────────────────────────────────────────

interface ResumeUploaderProps {
  onSuccess?: (versionId: string) => void;
}

type Phase = "idle" | "parsing" | "uploading" | "analyzing" | "done" | "error";

export function ResumeUploader({ onSuccess }: ResumeUploaderProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const analyzeResumeFn = useServerFn(analyzeResume);

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      // 1. Client-side validation (first line of defence — Supabase bucket
      //    policies also enforce MIME type and size server-side).
      const validationErr = validateFile(file);
      if (validationErr) throw new Error(validationErr);

      // 2. Parse PDF text
      setPhase("parsing");
      let text: string;
      try {
        text = await extractPdfText(file);
      } catch (err: any) {
        throw new Error(`PDF parsing failed: ${err.message}`);
      }

      // 3. Upload raw file to the private "resumes" bucket
      setPhase("uploading");
      const ext = file.name.split(".").pop() ?? "pdf";
      const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("resumes")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      // 4. Run AI analysis via server function (quota-free for base analysis)
      setPhase("analyzing");
      const result = await analyzeResumeFn({
        data: { text, filename: file.name, fileUrl: storagePath },
      });

      return result;
    },
    onSuccess: (result) => {
      setPhase("done");
      qc.invalidateQueries({ queryKey: ["resume-versions"] });
      qc.invalidateQueries({ queryKey: ["has-resume"] });
      qc.invalidateQueries({ queryKey: ["has-resume-coach"] });
      onSuccess?.(result.versionId);
    },
    onError: (err: Error) => {
      setPhase("error");
      setErrorMsg(err.message);
    },
  });

  function handleFile(file: File) {
    setErrorMsg(null);
    setFileName(file.name);
    setPhase("idle");
    mutation.mutate(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected after an error
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const phaseLabel: Record<Phase, string> = {
    idle: "Drop your PDF here or click to browse",
    parsing: "Reading PDF…",
    uploading: "Uploading…",
    analyzing: "Analysing with AI…",
    done: "Analysis complete!",
    error: "Upload failed",
  };

  const phaseProgress: Record<Phase, number> = {
    idle: 0,
    parsing: 25,
    uploading: 55,
    analyzing: 80,
    done: 100,
    error: 0,
  };

  const busy = phase === "parsing" || phase === "uploading" || phase === "analyzing";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors duration-200",
          busy || phase === "done"
            ? "pointer-events-none opacity-70"
            : "cursor-pointer hover:border-primary/60 hover:bg-primary/5",
          dragOver ? "border-primary bg-primary/10" : "border-muted",
          phase === "error" ? "border-destructive/50 bg-destructive/5" : "",
          phase === "done" ? "border-green-500/50 bg-green-500/5" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {phase === "done" ? (
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        ) : phase === "error" ? (
          <AlertCircle className="h-8 w-8 text-destructive" />
        ) : busy ? (
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}

        <div className="text-center">
          <p className="text-sm font-medium">{phaseLabel[phase]}</p>
          {fileName && phase !== "idle" && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <FileText className="h-3 w-3" /> {fileName}
            </p>
          )}
          {phase === "idle" && (
            <p className="text-xs text-muted-foreground mt-1">PDF · max 5 MB</p>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleInputChange}
          disabled={busy}
        />
      </div>

      {/* Progress bar */}
      {busy && (
        <Progress value={phaseProgress[phase]} className="h-1.5 bg-muted/40 transition-all" />
      )}

      {/* Error message */}
      {phase === "error" && errorMsg && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Retry button */}
      {phase === "error" && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setPhase("idle");
            setErrorMsg(null);
            setFileName(null);
            inputRef.current?.click();
          }}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
