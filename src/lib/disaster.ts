import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type CollectionPoint = Database['public']['Tables']['collection_points']['Row'];
export type Need = Database['public']['Tables']['needs']['Row'];
export type Report = Database['public']['Tables']['reports']['Row'];

// Adicionamos 'distance' como opcional para a tipagem
export type CollectionPointWithNeeds = CollectionPoint & { 
  needs: Need[];
  distance?: number;
};

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

/**
 * Busca coordenadas (lat/lng) de um endereço usando OpenStreetMap (Gratuito)
 */
export async function getCoordinatesFromAddress(address: string): Promise<{lat: number, lng: number} | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", Juiz de Fora, MG")}&limit=1`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar coordenadas:", error);
    return null;
  }
}

/**
 * Calcula a distância entre dois pontos em KM (Fórmula de Haversine)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const NEED_CATEGORIES = [
  'Água', 'Alimento não perecível', 'Alimento pronto', 'Roupa masculina',
  'Roupa feminina', 'Roupa infantil', 'Colchões', 'Cobertores',
  'Roupa de cama', 'Produtos de higiene pessoal', 'Produtos de higiene feminina',
  'Fraldas infantis', 'Fraldas para idosos', 'Ração animal',
  'Produtos de limpeza', 'Roupas Íntimas Novas', 'Papel Higiênico',
] as const;

export function getStatusLabel(status: string) {
  switch (status) {
    case 'open': return 'Aberto';
    case 'temporarily_closed': return 'Temp. Fechado';
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

export function formatLastUpdated(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 60) return `Atualizado há ${diffInMins <= 0 ? 'agora mesmo' : `${diffInMins} min`}`;
  if (diffInHours < 24) return `Atualizado há ${diffInHours}h`;
  if (diffInDays === 1) return `Atualizado ontem`;
  if (diffInDays < 7) return `Atualizado há ${diffInDays} dias`;

  return `Atualizado em ${date.toLocaleDateString('pt-BR')}`;
}