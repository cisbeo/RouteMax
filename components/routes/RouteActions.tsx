'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Route, RouteStop } from '@/lib/types';

interface RouteActionsProps {
  route: Route;
  stops: RouteStop[];
}

function generateGoogleMapsUrl(route: Route, stops: RouteStop[]): string {
  const includedStops = stops.filter((stop) => stop.isIncluded).sort((a, b) => a.stopOrder - b.stopOrder);

  const origin = encodeURIComponent(`${route.startLat},${route.startLng}`);
  const destination = encodeURIComponent(`${route.endLat},${route.endLng}`);

  const waypoints = includedStops
    .map((stop) => `${stop.lat},${stop.lng}`)
    .join('|')
    .split('')
    .map((char) => (char === ',' ? '%2C' : char === '|' ? '%7C' : char))
    .join('');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

function generateShareUrl(routeId: string, baseUrl: string): string {
  return `${baseUrl}/dashboard/routes/${routeId}`;
}

export function RouteActions({ route, stops }: RouteActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const router = useRouter();

  const googleMapsUrl = generateGoogleMapsUrl(route, stops);

  useEffect(() => {
    setShareUrl(generateShareUrl(route.id, window.location.origin));
  }, [route.id]);

  const handleExportToGoogleMaps = () => {
    try {
      if (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
        window.open(`comgooglemaps://?daddr=${route.endLat},${route.endLng}`, '_blank');
      } else {
        window.open(googleMapsUrl, '_blank');
      }
      toast.success('Opening route in Google Maps');
    } catch (error) {
      toast.error('Could not open Google Maps');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Route link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleDeleteRoute = async () => {
    if (!window.confirm('Are you sure you want to delete this route? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/routes/${route.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete route');
      }

      toast.success('Route deleted successfully');
      router.push('/dashboard/routes');
    } catch (error) {
      console.error('Delete route error:', error);
      toast.error('Failed to delete route');
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>

      <div className="space-y-3">
        <button
          onClick={handleExportToGoogleMaps}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Export to Google Maps
        </button>

        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Copy Route Link
        </button>

        <button
          onClick={handleDeleteRoute}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {isDeleting ? 'Deleting...' : 'Delete Route'}
        </button>
      </div>

      {/* Direct Links for Reference */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-600 mb-3">Direct Links:</p>
        <div className="space-y-2 text-xs">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:text-blue-800 truncate"
          >
            Google Maps URL
          </a>
          <div className="text-gray-500 truncate">Share URL: {shareUrl || '/dashboard/routes/' + route.id}</div>
        </div>
      </div>
    </div>
  );
}
