import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CreatePost } from "@/components/CreatePost";
import { PostCard, type FeedPost } from "@/components/PostCard";

export const Route = createFileRoute("/_app/feed")({ component: FeedPage });

function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: rows } = await supabase
      .from("posts")
      .select("id, author_id, content, image_url, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const list = rows ?? [];
    const authorIds = Array.from(new Set(list.map((p) => p.author_id)));
    const postIds = list.map((p) => p.id);

    const [{ data: profs }, { data: likes }, { data: myLikes }, { data: cmts }] = await Promise.all([
      authorIds.length
        ? supabase.from("profiles").select("id, full_name, avatar_url, club_name").in("id", authorIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? supabase.from("post_likes").select("post_id").in("post_id", postIds)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? supabase.from("post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id)
        : Promise.resolve({ data: [] as any[] }),
      postIds.length
        ? supabase.from("post_comments").select("post_id").in("post_id", postIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const lcount = new Map<string, number>();
    (likes ?? []).forEach((l: any) => lcount.set(l.post_id, (lcount.get(l.post_id) ?? 0) + 1));
    const mySet = new Set((myLikes ?? []).map((l: any) => l.post_id));
    const ccount = new Map<string, number>();
    (cmts ?? []).forEach((c: any) => ccount.set(c.post_id, (ccount.get(c.post_id) ?? 0) + 1));

    setPosts(list.map((p) => ({
      ...p,
      author: pmap.get(p.author_id) ?? null,
      likes_count: lcount.get(p.id) ?? 0,
      comments_count: ccount.get(p.id) ?? 0,
      liked_by_me: mySet.has(p.id),
    })) as FeedPost[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("feed-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return (
    <div className="space-y-4">
      <CreatePost onCreated={load} />
      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Carregando feed...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-lg font-semibold">Ainda não há publicações</p>
          <p className="mt-1 text-sm text-muted-foreground">Seja o primeiro a compartilhar algo com a comunidade.</p>
        </div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} onChange={load} />)
      )}
    </div>
  );
}
