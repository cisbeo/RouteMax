import { Suspense } from 'react';
import { SimpleRouteForm } from '@/components/routes/SimpleRouteForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Client } from '@/lib/types';

export const metadata = {
  title: 'Nouvelle Tournée Simple - RouteMax',
  description: 'Créer une tournée simple avec un point de départ, une destination et un retour',
};

function RouteFormSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-1/3 mb-6" />
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <div className="h-5 bg-gray-300 rounded w-1/4 mb-2" />
            <div className="h-10 bg-gray-300 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function getClients(): Promise<Client[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, address, lat, lng, is_active, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Failed to fetch clients:', error);
    return [];
  }

  return data as Client[];
}

export default async function SimpleRoutePage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const clients = await getClients();

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <Suspense fallback={<RouteFormSkeleton />}>
        <SimpleRouteForm googleMapsApiKey={googleMapsApiKey} clients={clients} />
      </Suspense>
    </main>
  );
}
