import { Suspense } from 'react';
import { RouteForm } from '@/components/routes/RouteForm';

export const metadata = {
  title: 'Create New Route - RouteMax',
  description: 'Plan a new route with optimized client suggestions',
};

function RouteFormSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow animate-pulse">
      <div className="h-8 bg-gray-300 rounded w-1/3 mb-6" />
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i}>
            <div className="h-5 bg-gray-300 rounded w-1/4 mb-2" />
            <div className="h-10 bg-gray-300 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewRoutePage() {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <Suspense fallback={<RouteFormSkeleton />}>
        <RouteForm googleMapsApiKey={googleMapsApiKey} />
      </Suspense>
    </main>
  );
}
