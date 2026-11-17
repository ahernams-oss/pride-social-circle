import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Registra o tempo conectado: a cada 60s com a aba visível soma até 60s ao dia do usuário. */
export function useActivityHeartbeat(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const secs = Math.min(120, Math.round((now - last) / 1000));
      last = now;
      if (document.visibilityState === "visible" && secs > 0) {
        void supabase.rpc("track_activity", { _seconds: secs });
      }
    };
    const id = window.setInterval(tick, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") last = Date.now(); else tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [userId]);
}
