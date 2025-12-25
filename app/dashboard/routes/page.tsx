'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RouteListItem {
  id: string;
  name: string;
  totalDistanceKm: number | null;
  totalDurationMinutes: number | null;
  totalVisits: number;
  createdAt: string;
  stopCount: number;
}

function RouteLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow p-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-5 bg-gray-300 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-300 rounded w-1/2" />
            </div>
            <div className="h-4 bg-gray-300 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface RoutesListClientProps {
  initialRoutes: RouteListItem[];
}

function RoutesListClient({ initialRoutes }: RoutesListClientProps) {
  const [routes, setRoutes] = useState<RouteListItem[]>(initialRoutes);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'distance' | 'duration' | 'stops'>('date');
  const [filterDistance, setFilterDistance] = useState<{ min: number; max: number }>({ min: 0, max: 1000 });
  const [filterStops, setFilterStops] = useState<{ min: number; max: number }>({ min: 0, max: 100 });
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());

  const filteredAndSortedRoutes = useMemo(() => {
    let filtered = routes.filter((route) => {
      const matchesSearch = route.name.toLowerCase().includes(searchTerm.toLowerCase());
      const distance = route.totalDistanceKm || 0;
      const matchesDistance = distance >= filterDistance.min && distance <= filterDistance.max;
      const matchesStops = route.stopCount >= filterStops.min && route.stopCount <= filterStops.max;
      return matchesSearch && matchesDistance && matchesStops;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'distance':
          return (b.totalDistanceKm || 0) - (a.totalDistanceKm || 0);
        case 'duration':
          return (b.totalDurationMinutes || 0) - (a.totalDurationMinutes || 0);
        case 'stops':
          return b.stopCount - a.stopCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [routes, searchTerm, sortBy, filterDistance, filterStops]);

  const handleSelectAll = () => {
    if (selectedRoutes.size === filteredAndSortedRoutes.length) {
      setSelectedRoutes(new Set());
    } else {
      setSelectedRoutes(new Set(filteredAndSortedRoutes.map((r) => r.id)));
    }
  };

  const handleSelectRoute = (id: string) => {
    const newSelected = new Set(selectedRoutes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRoutes(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedRoutes.size === 0) return;
    if (!confirm(`Delete ${selectedRoutes.size} route(s)? This cannot be undone.`)) return;

    try {
      const supabase = createClient();
      for (const id of selectedRoutes) {
        await fetch(`/api/routes/${id}`, { method: 'DELETE' });
      }
      setRoutes(routes.filter((r) => !selectedRoutes.has(r.id)));
      setSelectedRoutes(new Set());
    } catch (error) {
      console.error('Error deleting routes:', error);
      alert('Failed to delete routes');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Stops', 'Distance (km)', 'Duration (min)', 'Created Date'];
    const rows = filteredAndSortedRoutes.map((route) => [
      route.name,
      route.stopCount,
      route.totalDistanceKm?.toFixed(1) || 'N/A',
      route.totalDurationMinutes || 'N/A',
      new Date(route.createdAt).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `routes-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 6L15 12M9 12L15 6M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No routes yet</h3>
        <p className="text-gray-600 mb-4">Create your first route to get started.</p>
        <Link
          href="/dashboard/routes/new"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Route
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Search by route name</label>
          <input
            type="text"
            placeholder="Enter route name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            >
              <option value="date">Created (Newest)</option>
              <option value="distance">Distance (Longest)</option>
              <option value="duration">Duration (Longest)</option>
              <option value="stops">Stops (Most)</option>
            </select>
          </div>

          {/* Distance Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Distance: {filterDistance.min}-{filterDistance.max} km
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={filterDistance.min}
                onChange={(e) =>
                  setFilterDistance({ ...filterDistance, min: Number(e.target.value) })
                }
                placeholder="Min"
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              <input
                type="number"
                min="0"
                value={filterDistance.max}
                onChange={(e) =>
                  setFilterDistance({ ...filterDistance, max: Number(e.target.value) })
                }
                placeholder="Max"
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Stops Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Stops: {filterStops.min}-{filterStops.max}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={filterStops.min}
                onChange={(e) =>
                  setFilterStops({ ...filterStops, min: Number(e.target.value) })
                }
                placeholder="Min"
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              <input
                type="number"
                min="0"
                value={filterStops.max}
                onChange={(e) =>
                  setFilterStops({ ...filterStops, max: Number(e.target.value) })
                }
                placeholder="Max"
                className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedRoutes.size > 0 && (
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-600">
              {selectedRoutes.size} route(s) selected
            </span>
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Delete Selected
            </button>
          </div>
        )}

        {/* Export Button */}
        {filteredAndSortedRoutes.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Export to CSV ({filteredAndSortedRoutes.length} routes)
            </button>
          </div>
        )}
      </div>

      {/* Routes List */}
      {filteredAndSortedRoutes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No routes match your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All Checkbox Header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              checked={selectedRoutes.size === filteredAndSortedRoutes.length && filteredAndSortedRoutes.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({filteredAndSortedRoutes.length})
            </span>
          </div>

          {filteredAndSortedRoutes.map((route) => {
            const distanceDisplay = route.totalDistanceKm
              ? `${route.totalDistanceKm.toFixed(1)} km`
              : 'N/A';

            const durationHours = route.totalDurationMinutes
              ? Math.floor(route.totalDurationMinutes / 60)
              : 0;
            const durationMins = route.totalDurationMinutes
              ? route.totalDurationMinutes % 60
              : 0;
            const durationDisplay = durationHours > 0
              ? `${durationHours}h ${durationMins}m`
              : `${durationMins}m`;

            const createdDate = new Date(route.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={route.id}
                className="flex items-center gap-3 bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4"
              >
                <input
                  type="checkbox"
                  checked={selectedRoutes.has(route.id)}
                  onChange={() => handleSelectRoute(route.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <Link
                  href={`/dashboard/routes/${route.id}`}
                  className="flex-1 block hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{route.name}</h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        <span>{route.stopCount} stops</span>
                        <span>{distanceDisplay}</span>
                        <span>{durationDisplay}</span>
                        <span className="text-gray-500">Created {createdDate}</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right flex-shrink-0">
                      <div className="text-xs font-medium text-gray-500 mb-1">
                        View Route
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="text-center text-sm text-gray-600 mt-6">
        Showing {filteredAndSortedRoutes.length} of {routes.length} routes
      </div>
    </div>
  );
}

export default function RoutesPage() {
  // Fetch routes on client side using useEffect
  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/routes/user?page=1&pageSize=100');

        if (!response.ok) {
          throw new Error('Failed to fetch routes');
        }

        const { routes: fetchedRoutes } = await response.json();
        setRoutes(fetchedRoutes);
      } catch (err) {
        console.error('Routes list error:', err);
        setError('Failed to load routes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Routes</h1>
            <p className="text-gray-600 mt-1">Manage and view all your optimized routes</p>
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            <Link
              href="/dashboard/routes/new"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium whitespace-nowrap"
            >
              Création Manuelle
            </Link>
            <Link
              href="/dashboard/routes/auto-new"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap flex items-center gap-2"
            >
              Création Automatique
              <span className="text-yellow-300">✨</span>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <RouteLoadingSkeleton />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : (
          <RoutesListClient initialRoutes={routes} />
        )}
      </div>
    </main>
  );
}
