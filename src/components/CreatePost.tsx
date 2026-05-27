import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function CreatePost({ onCreated }: { onCreated: () => void }) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [posting, setPosting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      content: content.trim(),
      image_url: imageUrl.trim() || null,
    });
    setPosting(false);
    if (error) return toast.error(error.message);
    setContent(""); setImageUrl(""); setShowImage(false);
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
      {showImage && (
        <div className="mt-3 flex gap-2">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL da imagem (https://...)"
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => { setShowImage(false); setImageUrl(""); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {imageUrl && (
        <img src={imageUrl} alt="" className="mt-3 max-h-64 w-full rounded-lg object-cover" />
      )}
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowImage((v) => !v)} className="text-muted-foreground">
          <ImageIcon className="mr-2 h-4 w-4" /> Imagem
        </Button>
        <Button type="submit" disabled={!content.trim() || posting}>
          {posting ? "Publicando..." : "Publicar"}
        </Button>
      </div>
    </form>
  );
}
