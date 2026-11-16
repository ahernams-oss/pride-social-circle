import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { backupFeedImageToDrive } from "@/lib/drive-backup.functions";
import { toast } from "sonner";
import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL, imageLimitMessage, isWithinImageLimit } from "@/lib/feed-image-limit";

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function CreatePost({ onCreated }: { onCreated: () => void }) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const backupToDrive = useServerFn(backupFeedImageToDrive);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Selecione um arquivo de imagem.");
    if (!isWithinImageLimit(f.size)) return toast.error(imageLimitMessage(f.size));
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    setPosting(true);

    let imagePath: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("feed-images").upload(path, file);
      if (upErr) {
        setPosting(false);
        return toast.error(upErr.message);
      }
      imagePath = path;
    }

    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      content: content.trim(),
      image_url: imagePath,
    });
    if (error) {
      setPosting(false);
      return toast.error(error.message);
    }

    // Cópia silenciosa para o Google Drive do Distrito (endereço nunca exposto ao usuário).
    if (imagePath && file) {
      try {
        await backupToDrive({
          data: {
            path: imagePath,
            fileName: `feed-${Date.now()}-${file.name}`,
            mimeType: file.type || "image/jpeg",
          },
        });
      } catch (err) {
        console.error("Falha ao copiar imagem para o Drive:", err);
      }
    }

    setPosting(false);
    setContent("");
    clearFile();
    toast.success("Publicado!");
    onCreated();
  };

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-gold/30">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(profile?.full_name)}</AvatarFallback>
        </Avatar>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`O que está acontecendo no clube, ${profile?.full_name?.split(" ")[0] ?? "associado"}?`}
          rows={3}
          className="resize-none border-0 bg-muted/50 focus-visible:ring-1"
        />
      </div>
      {preview && (
        <div className="relative mt-3">
          <img src={preview} alt="" className="max-h-64 w-full rounded-lg object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7"
            onClick={clearFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="text-muted-foreground"
          >
            <ImageIcon className="mr-2 h-4 w-4" /> Imagem
          </Button>
          <span className="text-xs text-muted-foreground">até {MAX_IMAGE_LABEL}</span>
        </div>
        <Button type="submit" disabled={!content.trim() || posting}>
          {posting ? "Publicando..." : "Publicar"}
        </Button>
      </div>
    </form>
  );
}
