import { useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FileUploadField({
  accept,
  maxMB,
  currentName,
  onFile,
  onClear,
  label = "Upload",
  uploading,
}: {
  accept: string;
  maxMB: number;
  currentName?: string | null;
  onFile: (f: File) => void | Promise<void>;
  onClear?: () => void;
  label?: string;
  uploading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  function handle(f: File | undefined) {
    if (!f) return;
    if (f.size > maxMB * 1024 * 1024) {
      toast.error(`Max file size: ${maxMB}MB`);
      return;
    }
    onFile(f);
  }
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files[0]);
      }}
      className={`rounded-md border-2 border-dashed p-4 text-center text-sm ${drag ? "border-primary bg-primary/5" : "border-border"}`}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {currentName ? (
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{currentName}</span>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => ref.current?.click()}
              disabled={uploading}
            >
              Replace
            </Button>
            {onClear && (
              <Button type="button" size="sm" variant="ghost" onClick={onClear}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="w-full py-4 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Upload className="h-5 w-5" />
          <span>{uploading ? "Uploading…" : label}</span>
          <span className="text-xs">Drop a file or click · max {maxMB}MB</span>
        </button>
      )}
    </div>
  );
}
