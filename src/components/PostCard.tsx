import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export type FeedPost = {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author: { full_name: string; avatar_url: string | null; club_name: string } | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
};

export type FeedComment = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { full_name: string; avatar_url: string | null } | null;
};

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function PostCard({ post, onChange }: { post: FeedPost; onChange: () => void }) {
  const { user, isAdmin } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [liking, setLiking] = useState(false);

  const toggleLike = async () => {
    if (!user || liking) return;
    setLiking(true);
    if (post.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
    setLiking(false);
    onChange();
  };

  const loadComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from("post_comments")
      .select("id, author_id, content, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    const ids = Array.from(new Set((data ?? []).map((c) => c.author_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setComments((data ?? []).map((c) => ({ ...c, author: map.get(c.author_id) ?? null })) as FeedComment[]);
    setLoadingComments(false);
  };

  const openComments = async () => {
    if (!showComments) await loadComments();
    setShowComments((v) => !v);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    const { error } = await supabase.from("post_comments").insert({
      post_id: post.id, author_id: user.id, content: newComment.trim(),
    });
    if (error) return toast.error(error.message);
    setNewComment("");
    await loadComments();
    onChange();
  };

  const deletePost = async () => {
    if (!confirm("Apagar esta publicação?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Publicação removida");
    onChange();
  };

  const canDelete = user?.id === post.author_id || isAdmin;

  return (
    <article className="rounded-xl border bg-card shadow-sm">
      <header className="flex items-start justify-between gap-3 p-4">
        <Link to="/profile/$id" params={{ id: post.author_id }} className="flex items-center gap-3 group">
          <Avatar className="h-10 w-10 ring-2 ring-gold/30">
            <AvatarImage src={post.author?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(post.author?.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-card-foreground group-hover:underline">{post.author?.full_name ?? "Associado"}</div>
            <div className="text-xs text-muted-foreground">
              {post.author?.club_name || "Lions Clube"} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </div>
          </div>
        </Link>
        {canDelete && (
          <Button variant="ghost" size="icon" onClick={deletePost} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="px-4 pb-3">
        <p className="whitespace-pre-wrap text-card-foreground">{post.content}</p>
      </div>
      {post.image_url && (
        <div className="border-y bg-muted">
          <img src={post.image_url} alt="" className="max-h-[520px] w-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-1 border-t px-2 py-1">
        <Button variant="ghost" onClick={toggleLike} className={post.liked_by_me ? "text-destructive" : "text-muted-foreground"}>
          <Heart className={`mr-2 h-4 w-4 ${post.liked_by_me ? "fill-current" : ""}`} />
          {post.likes_count > 0 ? post.likes_count : ""} Curtir
        </Button>
        <Button variant="ghost" onClick={openComments} className="text-muted-foreground">
          <MessageCircle className="mr-2 h-4 w-4" />
          {post.comments_count > 0 ? post.comments_count : ""} Comentar
        </Button>
      </div>

      {showComments && (
        <div className="space-y-3 border-t bg-muted/30 p-4">
          {loadingComments ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Seja o primeiro a comentar.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(c.author?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-xl bg-card px-3 py-2">
                  <div className="text-xs font-semibold">{c.author?.full_name ?? "Associado"}</div>
                  <div className="text-sm">{c.content}</div>
                </div>
              </div>
            ))
          )}
          <form onSubmit={submitComment} className="flex gap-2">
            <Textarea
              rows={1}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="min-h-10 resize-none bg-card"
            />
            <Button type="submit" disabled={!newComment.trim()}>Enviar</Button>
          </form>
        </div>
      )}
    </article>
  );
}
