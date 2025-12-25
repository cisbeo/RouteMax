'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { AutoOptimizeRequest, MandatoryDestination, Client } from '@/lib/types';
import { GooglePlacesAutocomplete } from '@/components/ui/GooglePlacesAutocomplete';

interface AutoRouteFormProps {
  clients: Array<Pick<Client, 'id' | 'name' | 'address' | 'lat' | 'lng'>>;
}

export function AutoRouteForm({ clients }: AutoRouteFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [formData, setFormData] = useState<AutoOptimizeRequest>({
    name: '',
    startAddress: '',
    startLat: 0,
    startLng: 0,
    startDatetime: '',
    mandatoryDestination: {
      address: '',
      lat: 0,
      lng: 0,
      clientId: undefined,
    },
    endAddress: '',
    endLat: 0,
    endLng: 0,
    maxReturnTime: '',
    visitDurationMinutes: 20,
    prospectSearchRadiusKm: 5,
    maxClientsPerDay: 25,
    lunchBreakStartTime: null,
    lunchBreakDurationMinutes: null,
    vehicleType: 'driving',
  });

  // Destination type: 'client' or 'custom'
  const [destinationType, setDestinationType] = useState<'client' | 'custom'>('client');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nom de tournée requis';
    }

    if (!formData.startAddress.trim()) {
      newErrors.startAddress = 'Adresse de départ requise';
    }

    if (!formData.mandatoryDestination.address.trim()) {
      newErrors.mandatoryDestination = 'Destination obligatoire requise';
    }

    if (!formData.endAddress.trim()) {
      newErrors.endAddress = 'Adresse de retour requise';
    }

    if (!formData.startDatetime) {
      newErrors.startDatetime = 'Heure de départ requise';
    }

    if (!formData.maxReturnTime) {
      newErrors.maxReturnTime = 'Heure de retour MAX requise';
    }

    // Vérifier que maxReturnTime > startDatetime
    if (formData.startDatetime && formData.maxReturnTime) {
      const start = new Date(formData.startDatetime);
      const end = new Date(formData.maxReturnTime);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      if (diffHours < 2) {
        newErrors.maxReturnTime = 'L\'heure de retour doit être au moins 2h après le départ';
      }
    }

    // Vérifier que les coordonnées sont valides
    if (formData.startLat === 0 && formData.startLng === 0) {
      newErrors.startAddress = 'Sélectionnez une adresse dans la liste déroulante';
    }

    if (formData.mandatoryDestination.lat === 0 && formData.mandatoryDestination.lng === 0) {
      newErrors.mandatoryDestination = 'Sélectionnez une adresse dans la liste déroulante';
    }

    if (formData.endLat === 0 && formData.endLng === 0) {
      newErrors.endAddress = 'Sélectionnez une adresse dans la liste déroulante';
    }

    setErrors(newErrors);

    // Debug log
    console.log('=== VALIDATION START ===');
    console.log('Form data:', {
      name: formData.name,
      startAddress: formData.startAddress,
      startLat: formData.startLat,
      startLng: formData.startLng,
      mandatoryDestination: formData.mandatoryDestination,
      endAddress: formData.endAddress,
      endLat: formData.endLat,
      endLng: formData.endLng,
      startDatetime: formData.startDatetime,
      maxReturnTime: formData.maxReturnTime,
    });

    if (Object.keys(newErrors).length > 0) {
      console.log('❌ Validation FAILED with errors:', newErrors);
    } else {
      console.log('✅ Validation PASSED');
    }
    console.log('=== VALIDATION END ===');

    return Object.keys(newErrors).length === 0;
  };

  // Handle client selection for mandatory destination
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setFormData((prev) => ({
        ...prev,
        mandatoryDestination: {
          address: client.address,
          lat: client.lat,
          lng: client.lng,
          clientId: client.id,
        },
      }));
      setErrors((prev) => ({ ...prev, mandatoryDestination: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!');

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs du formulaire');
      return;
    }

    console.log('Validation passed, submitting to API...');
    setLoading(true);

    try {
      // Convert datetime-local to ISO 8601 format
      const requestData = {
        ...formData,
        startDatetime: new Date(formData.startDatetime).toISOString(),
        maxReturnTime: new Date(formData.maxReturnTime).toISOString(),
      };

      console.log('Request data with ISO dates:', requestData);

      const response = await fetch('/api/routes/auto-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('=== API ERROR RESPONSE ===');
        console.error('Status:', response.status);
        console.error('Error data:', errorData);

        const { error, code, details } = errorData;

        if (code === 'TIME_CONSTRAINT_IMPOSSIBLE') {
          toast.error(
            `Impossible de respecter l'heure de retour. Dépassement: ${details.overtimeMinutes} min`,
            { duration: 5000 }
          );
        } else if (details) {
          // Show Zod validation errors
          console.error('Validation errors:', details);
          toast.error(error || 'Erreur de validation', {
            description: JSON.stringify(details, null, 2),
            duration: 10000,
          });
        } else {
          toast.error(error || 'Erreur lors de la création de la route');
        }
        return;
      }

      const result = await response.json();

      toast.success(`Route créée avec ${result.prospectsIncluded} prospects inclus`);

      if (result.prospectsExcluded && result.prospectsExcluded > 0) {
        toast.warning(
          `${result.prospectsExcluded} prospects exclus pour respecter l'heure de retour`
        );
      }

      if (result.clientsOutsideOpeningHours && result.clientsOutsideOpeningHours.length > 0) {
        toast.warning(
          `Clients hors horaires d'ouverture (9h-17h) : ${result.clientsOutsideOpeningHours.join(', ')}`,
          { duration: 5000 }
        );
      }

      router.push(`/dashboard/routes/${result.route.id}`);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Erreur lors de la création de la route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nom de la tournée */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
          Nom de la tournée <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, name: e.target.value }));
            setErrors((prev) => ({ ...prev, name: '' }));
          }}
          placeholder="Ex: Tournée Lundi 26 Décembre"
          className={`w-full px-3 py-2 border rounded-md text-gray-900 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
      </div>

      {/* Point de départ */}
      <div>
        <label htmlFor="startAddress" className="block text-sm font-medium text-gray-900 mb-1">
          Point de départ <span className="text-red-500">*</span>
        </label>
        <GooglePlacesAutocomplete
          id="startAddress"
          value={formData.startAddress}
          onChange={(address, lat, lng) => {
            setFormData((prev) => ({
              ...prev,
              startAddress: address,
              startLat: lat,
              startLng: lng,
            }));
            if (lat !== 0 && lng !== 0) {
              setErrors((prev) => ({ ...prev, startAddress: '' }));
            }
          }}
          placeholder="Ex: 10 Rue de Rivoli, Paris"
          className={`w-full px-3 py-2 border rounded-md ${
            errors.startAddress ? 'border-red-500' : 'border-gray-300'
          }`}
          error={errors.startAddress}
          onFocus={() => setErrors((prev) => ({ ...prev, startAddress: '' }))}
        />
        {errors.startAddress && (
          <p className="text-sm text-red-500 mt-1">{errors.startAddress}</p>
        )}
      </div>

      {/* Destination obligatoire */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Destination obligatoire <span className="text-red-500">*</span>
        </label>

        {/* Type selector */}
        <div className="flex gap-4 mb-3">
          <button
            type="button"
            onClick={() => {
              setDestinationType('client');
              setFormData((prev) => ({
                ...prev,
                mandatoryDestination: {
                  address: '',
                  lat: 0,
                  lng: 0,
                  clientId: undefined,
                },
              }));
              setSelectedClientId('');
            }}
            className={`px-4 py-2 rounded-md ${
              destinationType === 'client'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Client existant
          </button>
          <button
            type="button"
            onClick={() => {
              setDestinationType('custom');
              setFormData((prev) => ({
                ...prev,
                mandatoryDestination: {
                  address: '',
                  lat: 0,
                  lng: 0,
                  clientId: undefined,
                },
              }));
              setSelectedClientId('');
            }}
            className={`px-4 py-2 rounded-md ${
              destinationType === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Nouvelle adresse
          </button>
        </div>

        {/* Client selector */}
        {destinationType === 'client' && (
          <select
            value={selectedClientId}
            onChange={(e) => handleClientSelect(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md text-gray-900 ${
              errors.mandatoryDestination ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Sélectionner un client --</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} - {client.address}
              </option>
            ))}
          </select>
        )}

        {/* Custom address input */}
        {destinationType === 'custom' && (
          <GooglePlacesAutocomplete
            id="mandatoryDestination"
            value={formData.mandatoryDestination.address}
            onChange={(address, lat, lng) => {
              setFormData((prev) => ({
                ...prev,
                mandatoryDestination: {
                  address,
                  lat,
                  lng,
                  clientId: undefined,
                },
              }));
              if (lat !== 0 && lng !== 0) {
                setErrors((prev) => ({ ...prev, mandatoryDestination: '' }));
              }
            }}
            placeholder="Ex: 20 Avenue des Champs-Élysées, Paris"
            className={`w-full px-3 py-2 border rounded-md ${
              errors.mandatoryDestination ? 'border-red-500' : 'border-gray-300'
            }`}
            error={errors.mandatoryDestination}
            onFocus={() => setErrors((prev) => ({ ...prev, mandatoryDestination: '' }))}
          />
        )}

        {errors.mandatoryDestination && (
          <p className="text-sm text-red-500 mt-1">{errors.mandatoryDestination}</p>
        )}
      </div>

      {/* Point d'arrivée */}
      <div>
        <label htmlFor="endAddress" className="block text-sm font-medium text-gray-900 mb-1">
          Point d'arrivée <span className="text-red-500">*</span>
        </label>
        <GooglePlacesAutocomplete
          id="endAddress"
          value={formData.endAddress}
          onChange={(address, lat, lng) => {
            setFormData((prev) => ({
              ...prev,
              endAddress: address,
              endLat: lat,
              endLng: lng,
            }));
            if (lat !== 0 && lng !== 0) {
              setErrors((prev) => ({ ...prev, endAddress: '' }));
            }
          }}
          placeholder="Ex: 10 Rue de Rivoli, Paris (retour domicile)"
          className={`w-full px-3 py-2 border rounded-md ${
            errors.endAddress ? 'border-red-500' : 'border-gray-300'
          }`}
          error={errors.endAddress}
          onFocus={() => setErrors((prev) => ({ ...prev, endAddress: '' }))}
        />
        {errors.endAddress && <p className="text-sm text-red-500 mt-1">{errors.endAddress}</p>}
      </div>

      {/* Date/heure de départ */}
      <div>
        <label htmlFor="startDatetime" className="block text-sm font-medium text-gray-900 mb-1">
          Date et heure de départ <span className="text-red-500">*</span>
        </label>
        <input
          id="startDatetime"
          type="datetime-local"
          value={formData.startDatetime}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, startDatetime: e.target.value }));
            setErrors((prev) => ({ ...prev, startDatetime: '' }));
          }}
          className={`w-full px-3 py-2 border rounded-md text-gray-900 ${
            errors.startDatetime ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.startDatetime && (
          <p className="text-sm text-red-500 mt-1">{errors.startDatetime}</p>
        )}
      </div>

      {/* Heure de retour MAX */}
      <div>
        <label htmlFor="maxReturnTime" className="block text-sm font-medium text-gray-900 mb-1">
          Heure de retour MAX <span className="text-red-500">*</span>
        </label>
        <input
          id="maxReturnTime"
          type="datetime-local"
          value={formData.maxReturnTime}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, maxReturnTime: e.target.value }));
            setErrors((prev) => ({ ...prev, maxReturnTime: '' }));
          }}
          className={`w-full px-3 py-2 border rounded-md text-gray-900 ${
            errors.maxReturnTime ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <p className="text-xs text-gray-500 mt-1">
          Contrainte dure : la route doit se terminer avant cette heure
        </p>
        {errors.maxReturnTime && (
          <p className="text-sm text-red-500 mt-1">{errors.maxReturnTime}</p>
        )}
      </div>

      {/* Options avancées */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-900"
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          Options avancées
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Durée de visite */}
            <div>
              <label htmlFor="visitDuration" className="block text-sm font-medium text-gray-900 mb-1">
                Durée de visite par défaut (minutes)
              </label>
              <input
                id="visitDuration"
                type="number"
                min="5"
                max="120"
                value={formData.visitDurationMinutes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    visitDurationMinutes: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            {/* Rayon de recherche */}
            <div>
              <label htmlFor="searchRadius" className="block text-sm font-medium text-gray-900 mb-1">
                Rayon de recherche prospects (km)
              </label>
              <input
                id="searchRadius"
                type="number"
                min="1"
                max="20"
                value={formData.prospectSearchRadiusKm}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    prospectSearchRadiusKm: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>

            {/* Nombre maximum de clients par jour */}
            <div>
              <label htmlFor="maxClients" className="block text-sm font-medium text-gray-900 mb-1">
                Nombre maximum de clients à visiter
              </label>
              <input
                id="maxClients"
                type="number"
                min="1"
                max="50"
                value={formData.maxClientsPerDay}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxClientsPerDay: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
              <p className="text-xs text-gray-600 mt-1">
                Limite le nombre de clients inclus dans la tournée (max 50)
              </p>
            </div>

            {/* Type de véhicule */}
            <div>
              <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-900 mb-1">
                Type de véhicule
              </label>
              <select
                id="vehicleType"
                value={formData.vehicleType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    vehicleType: e.target.value as 'driving' | 'bicycling' | 'walking',
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="driving">Voiture</option>
                <option value="bicycling">Vélo</option>
                <option value="walking">À pied</option>
              </select>
            </div>

            {/* Pause déjeuner */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Pause déjeuner</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lunchTime" className="block text-xs text-gray-900 mb-1">
                    Heure de début (HH:MM)
                  </label>
                  <input
                    id="lunchTime"
                    type="time"
                    value={formData.lunchBreakStartTime || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lunchBreakStartTime: e.target.value || null,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="lunchDuration" className="block text-xs text-gray-900 mb-1">
                    Durée (minutes)
                  </label>
                  <input
                    id="lunchDuration"
                    type="number"
                    min="15"
                    max="180"
                    value={formData.lunchBreakDurationMinutes || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lunchBreakDurationMinutes: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Création en cours...' : 'Créer la tournée automatiquement'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
