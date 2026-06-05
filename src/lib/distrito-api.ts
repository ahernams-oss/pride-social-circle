export const DISTRITO_BASE_URL =
  "https://project--abd51fc7-8aaa-46bd-b126-e1a3f65157d5.lovable.app";

export async function fetchDistrito<T>(path: string): Promise<T> {
  const res = await fetch(`${DISTRITO_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Erro ao buscar ${path}: ${res.status}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

export type Governador = {
  id: string;
  name: string;
  role: string;
  year_label: string;
  motto: string;
  bio: string;
  photo_url: string;
};

export type Projeto = {
  id: string;
  title: string;
  tag: string;
  description: string;
  content: string;
  cover_url: string;
};

export type Evento = {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  tag: string;
  cover_url: string;
};
