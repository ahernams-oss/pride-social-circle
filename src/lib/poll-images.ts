import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const POLL_IMAGE_MAX_BYTES = 500 * 1024;
export const isPollImageWithinLimit = (bytes: number) => bytes <= POLL_IMAGE_MAX_BYTES;
export const pollImageLimitMessage = (bytes: number) =>
  `A imagem deve ter no máximo 500 KB. A sua tem ${bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1) + " MB" : Math.round(bytes / 1024) + " KB"}.`;

export async function uploadPollImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("poll-images").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Falha ao enviar imagem: " + error.message);
  return path;
}

export function usePollImage(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return setUrl(null);
    let alive = true;
    supabase.storage.from("poll-images").createSignedUrl(path, 3600).then(({ data }) => alive && setUrl(data?.signedUrl ?? null));
    return () => { alive = false; };
  }, [path]);
  return url;
}
