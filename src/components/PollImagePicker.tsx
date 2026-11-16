import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isPollImageWithinLimit, pollImageLimitMessage } from "@/lib/poll-images";

/** Seleção opcional de imagem (até 500 KB) com prévia. */
export function PollImagePicker({ file, onChange, label = "Imagem" }: { file: File | null; onChange: (f: File | null) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setPreview(null);
    const u = URL.createObjectURL(file); setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="flex items-center gap-2">
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f) return;
        if (!isPollImageWithinLimit(f.size)) return toast.error(pollImageLimitMessage(f.size));
        onChange(f);
      }} />
      {preview ? (
        <div className="relative">
          <img src={preview} alt="" className="h-14 w-14 rounded-md border object-cover" />
          <button type="button" onClick={() => onChange(null)} aria-label="Remover imagem"
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"><X className="h-3 w-3" /></button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={() => ref.current?.click()}>
          <ImagePlus className="mr-1 h-4 w-4" /> {label} <span className="ml-1 text-xs text-muted-foreground">(opcional, até 500 KB)</span>
        </Button>
      )}
    </div>
  );
}
