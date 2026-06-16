import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Separate Supabase client used only inside the Kiosk page so the
// voter login does NOT replace the admin's session in the main app.
let _kiosk: ReturnType<typeof create> | undefined;

function create() {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  return createClient<Database>(url, key, {
    auth: {
      storageKey: "lions-kiosk-voter",
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getKioskClient() {
  if (!_kiosk) _kiosk = create();
  return _kiosk;
}
