import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AutoRouteForm } from '@/components/routes/AutoRouteForm';

export const metadata = {
  title: 'Création Automatique de Tournée | RouteMax',
  description: 'Créez automatiquement une tournée optimisée avec découverte intelligente de prospects',
};

export default async function AutoNewRoutePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Récupérer clients actifs pour autocomplete de destination
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, address, lat, lng')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching clients:', error);
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Création Automatique de Tournée
        </h1>
        <p className="text-gray-600">
          Renseignez votre destination obligatoire et laissez RouteMax trouver
          automatiquement les prospects à visiter sur votre trajet.
        </p>
      </div>

      <AutoRouteForm clients={clients || []} />
    </div>
  );
}
