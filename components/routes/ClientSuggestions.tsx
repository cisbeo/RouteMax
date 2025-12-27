'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { Route, SuggestedClient } from '@/lib/types';

interface ClientSuggestionsProps {
  route: Route;
  existingClientIds: string[];
  onRecalculate: (clientIds: string[]) => Promise<void>;
}

export function ClientSuggestions({
  route,
  existingClientIds,
  onRecalculate,
}: ClientSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedClient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/routes/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLat: route.startLat,
          startLng: route.startLng,
          endLat: route.endLat,
          endLng: route.endLng,
          corridorRadiusKm: 10,
          maxSuggestions: 30,
          // Pass existing client IDs to build corridor from actual route
          existingClientIds: existingClientIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      // Filter out clients already in the route
      console.log('Suggestions from API:', data.suggestions?.length || 0);
      console.log('Existing client IDs:', existingClientIds.length);
      const filtered = (data.suggestions || []).filter(
        (s: SuggestedClient) => !existingClientIds.includes(s.id)
      );
      console.log('After filtering:', filtered.length);
      setSuggestions(filtered);
    } catch (error) {
      console.error('Fetch suggestions error:', error);
      toast.error('Impossible de charger les suggestions');
    } finally {
      setLoading(false);
    }
  }, [route, existingClientIds]);

  useEffect(() => {
    if (expanded && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [expanded, suggestions.length, fetchSuggestions]);

  const handleToggle = (clientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map((s) => s.id)));
    }
  };

  const handleRecalculate = async () => {
    if (selectedIds.size === 0) {
      toast.error('Sélectionnez au moins un client');
      return;
    }

    setRecalculating(true);
    try {
      await onRecalculate(Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success('Route recalculée');
    } catch (error) {
      console.error('Recalculate error:', error);
      toast.error('Échec du recalcul');
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-xl font-bold text-gray-900">
          Clients à proximité
        </h2>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-gray-500 py-4">Aucun client suggéré à proximité du trajet.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {selectedIds.size === suggestions.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
                </span>
              </div>

              <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                {suggestions.map((client) => (
                  <li key={client.id}>
                    <label className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(client.id)}
                        onChange={() => handleToggle(client.id)}
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{client.name}</p>
                        <p className="text-sm text-gray-500 truncate">{client.address}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {(client.distanceFromRouteLine / 1000).toFixed(1)} km du trajet • Score: {client.score}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleRecalculate}
                disabled={selectedIds.size === 0 || recalculating}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {recalculating ? 'Recalcul en cours...' : `Recalculer avec ${selectedIds.size} client${selectedIds.size > 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
