import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/events")({ component: EventsPage });

type Event = {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  created_by: string;
};

function EventsPage() {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", starts_at: "" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("events").select("*").order("starts_at", { ascending: true });
    setEvents((data ?? []) as Event[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("events").insert({
      title: form.title, description: form.description, location: form.location,
      starts_at: form.starts_at, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Evento criado");
    setOpen(false);
    setForm({ title: "", description: "", location: "", starts_at: "" });
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Eventos</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo evento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar evento</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Título</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Data e hora</Label><Input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div><Label>Local</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <Button type="submit" className="w-full">Criar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-semibold">{ev.title}</h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(ev.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {ev.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ev.location}</span>}
                </div>
                {ev.description && <p className="mt-2 whitespace-pre-wrap text-sm">{ev.description}</p>}
              </div>
              {(isAdmin || ev.created_by === user?.id) && (
                <Button size="icon" variant="ghost" onClick={() => remove(ev.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Nenhum evento agendado.</p>
        )}
      </div>
    </div>
  );
}
