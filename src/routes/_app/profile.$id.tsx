import { createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { MapPin, Building2, MessageCircle, Pencil } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Profile } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/profile/$id")({ component: ProfilePage });

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function ProfilePage() {
  const { id } = useParams({ from: "/_app/profile/$id" });
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ full_name: "", bio: "", club_name: "", city: "", role_in_club: "", role_in_district: "", avatar_url: "" });
  const [districtRoles, setDistrictRoles] = useState<{ id: string; name: string }[]>([]);
  const [clubRoles, setClubRoles] = useState<{ id: string; name: string }[]>([]);
  const [history, setHistory] = useState<Array<{ id: string; scope: string; role_name: string; start_year: number; end_year: number | null }>>([]);
  const [newHist, setNewHist] = useState<{ scope: "club" | "district"; role_name: string; start_year: string; end_year: string }>({ scope: "club", role_name: "", start_year: String(new Date().getFullYear()), end_year: "" });
  const isMe = user?.id === id;

  const load = useCallback(async () => {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    setProfile(p as Profile | null);
    if (p) setForm({
      full_name: p.full_name, bio: p.bio, club_name: p.club_name, city: p.city,
      role_in_club: p.role_in_club, role_in_district: p.role_in_district ?? "",
      avatar_url: p.avatar_url ?? "",
    });

    const [{ data: dr }, { data: cr }] = await Promise.all([
      supabase.from("district_roles").select("id, name").order("name"),
      supabase.from("club_roles").select("id, name").order("name"),
    ]);
    setDistrictRoles(dr ?? []);
    setClubRoles(cr ?? []);

    const { data: rows } = await supabase
      .from("posts").select("id, author_id, content, image_url, created_at")
      .eq("author_id", id).order("created_at", { ascending: false });
    const list = rows ?? [];
    const postIds = list.map((x) => x.id);
    const [{ data: likes }, { data: myLikes }, { data: cmts }] = await Promise.all([
      postIds.length ? supabase.from("post_likes").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
      postIds.length && user ? supabase.from("post_likes").select("post_id").in("post_id", postIds).eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from("post_comments").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const lcount = new Map<string, number>();
    (likes ?? []).forEach((l: any) => lcount.set(l.post_id, (lcount.get(l.post_id) ?? 0) + 1));
    const mySet = new Set((myLikes ?? []).map((l: any) => l.post_id));
    const ccount = new Map<string, number>();
    (cmts ?? []).forEach((c: any) => ccount.set(c.post_id, (ccount.get(c.post_id) ?? 0) + 1));

    setPosts(list.map((x) => ({
      ...x,
      author: p ? { full_name: p.full_name, avatar_url: p.avatar_url, club_name: p.club_name } : null,
      likes_count: lcount.get(x.id) ?? 0,
      comments_count: ccount.get(x.id) ?? 0,
      liked_by_me: mySet.has(x.id),
    })) as FeedPost[]);
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, bio: form.bio, club_name: form.club_name,
      city: form.city, role_in_club: form.role_in_club, role_in_district: form.role_in_district,
      avatar_url: form.avatar_url || null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
    setEditing(false);
    await load();
    if (isMe) await refresh();
  };

  const startDM = async () => {
    if (!user || isMe) return;
    // find existing 1:1
    const { data: mine } = await supabase
      .from("conversation_participants").select("conversation_id").eq("user_id", user.id);
    const myConvIds = (mine ?? []).map((r: any) => r.conversation_id);
    let convId: string | null = null;
    if (myConvIds.length) {
      const { data: shared } = await supabase
        .from("conversation_participants").select("conversation_id")
        .in("conversation_id", myConvIds).eq("user_id", id);
      convId = shared?.[0]?.conversation_id ?? null;
    }
    if (!convId) {
      const { data: conv, error } = await supabase.from("conversations").insert({}).select("id").single();
      if (error || !conv) return toast.error(error?.message ?? "Erro");
      convId = conv.id;
      await supabase.from("conversation_participants").insert([
        { conversation_id: convId, user_id: user.id },
        { conversation_id: convId, user_id: id },
      ]);
    }
    nav({ to: "/messages", search: { c: convId } });
  };

  if (!profile) return <p className="py-12 text-center text-muted-foreground">Carregando perfil...</p>;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="h-32 bg-lions-gradient" />
        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end justify-between gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-2xl text-primary-foreground">{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2 pb-2">
              {isMe ? (
                <Button variant="outline" onClick={() => setEditing((v) => !v)}>
                  <Pencil className="mr-2 h-4 w-4" /> {editing ? "Cancelar" : "Editar perfil"}
                </Button>
              ) : (
                <Button onClick={startDM}>
                  <MessageCircle className="mr-2 h-4 w-4" /> Mensagem
                </Button>
              )}
            </div>
          </div>
          {editing ? (
            <form onSubmit={save} className="mt-4 space-y-3">
              <div>
                <Label>Foto de perfil</Label>
                <div className="mt-1 flex items-center gap-3">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={form.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{initials(form.full_name)}</AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user) return;
                      setUploading(true);
                      const ext = file.name.split(".").pop() ?? "jpg";
                      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
                      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
                      if (upErr) { toast.error(upErr.message); setUploading(false); return; }
                      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
                      setForm((f) => ({ ...f, avatar_url: data.publicUrl }));
                      setUploading(false);
                      toast.success("Foto enviada");
                    }}
                  />
                </div>
              </div>
              <div><Label>Nome</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Clube</Label><Input value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} /></div>
                <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div>
                <Label>Cargo no clube</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.role_in_club}
                  onChange={(e) => setForm({ ...form, role_in_club: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {clubRoles.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Cargo no Distrito</Label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.role_in_district}
                  onChange={(e) => setForm({ ...form, role_in_district: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {districtRoles.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} /></div>
              <Button type="submit" disabled={uploading}>{uploading ? "Enviando..." : "Salvar"}</Button>
            </form>
          ) : (
            <>
              <h1 className="mt-3 text-2xl font-bold">{profile.full_name}</h1>
              {profile.role_in_club && <div className="text-sm text-accent-foreground"><span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium">{profile.role_in_club}</span></div>}
              {profile.role_in_district && <div className="mt-1 text-sm"><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Distrito: {profile.role_in_district}</span></div>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {profile.club_name && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{profile.club_name}</span>}
                {profile.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.city}</span>}
              </div>
              {profile.bio && <p className="mt-3 whitespace-pre-wrap text-sm text-card-foreground">{profile.bio}</p>}
            </>
          )}
        </div>
      </div>

      <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Publicações</h2>
      {posts.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Nenhuma publicação ainda.</p>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} onChange={load} />)
      )}
    </div>
  );
}
