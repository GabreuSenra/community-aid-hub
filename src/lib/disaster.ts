import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type CollectionPoint = Database['public']['Tables']['collection_points']['Row'];
export type Need = Database['public']['Tables']['needs']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];

export type CollectionPointWithNeeds = CollectionPoint & { needs: Need[] };

export async function fetchPublicCollectionPoints(): Promise<CollectionPointWithNeeds[]> {
  const { data: points, error } = await supabase
    .from('collection_points')
    .select('*, needs(*)')
    .order('name');

  if (error) throw error;

  return (points as CollectionPointWithNeeds[]) || [];
}

export async function fetchUserCollectionPoints(
  userId: string
): Promise<CollectionPointWithNeeds[]> {
  const { data: points, error } = await supabase
    .from('collection_points')
    .select('*, needs(*)')
    .eq('new_uuid', userId)
    .order('name');

  if (error) throw error;

  return (points as CollectionPointWithNeeds[]) || [];
}

export async function fetchReports(hoursFilter: number = 24): Promise<Report[]> {
  const since = new Date(Date.now() - hoursFilter * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export function getMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export const NEED_CATEGORIES = [
  'Água',
  'Alimento não perecível',
  'Alimento pronto',
  'Roupa masculina',
  'Roupa feminina',
  'Roupa infantil',
  'Colchões',
  'Cobertores',
  'Roupa de cama',
  'Produtos de higiene pessoal',
  'Produtos de higiene feminina',
  'Fraldas infantis',
  'Fraldas para idosos',
  'Ração animal',
  'Produtos de limpeza',
  'Roupas Íntimas Novas',
  'Leite em Pó, Fórmulas Infantís',
  'Papel Higiênico',
  'Outros',
] as const;

export function getStatusLabel(status: string) {
  switch (status) {
    case 'open': return 'Aberto';
    case 'temporarily_closed': return 'Temporariamente Fechado';
    case 'closed': return 'Encerrado';
    default: return status;
  }
}

export function getStatusClass(status: string) {
  switch (status) {
    case 'open': return 'status-open';
    case 'temporarily_closed': return 'status-temp';
    case 'closed': return 'status-closed';
    default: return 'status-closed';
  }
}
