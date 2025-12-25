import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { clientImportSchema } from '@/lib/utils/validation';
import { geocodeAddressesBatch } from '@/lib/utils/geocode';
import type { Client, ImportResult } from '@/lib/types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const validationResult = clientImportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { clients: clientsToImport } = validationResult.data;

    const uniqueAddresses = [...new Set(clientsToImport.map(c => c.address))];
    const geocodeResults = await geocodeAddressesBatch(uniqueAddresses);

    const successfulClients: Client[] = [];
    const failedClients: Array<{
      name: string;
      address: string;
      error: string;
    }> = [];

    for (const clientData of clientsToImport) {
      const geocodeResult = geocodeResults.get(clientData.address);

      if (geocodeResult instanceof Error) {
        failedClients.push({
          name: clientData.name,
          address: clientData.address,
          error: geocodeResult.message,
        });
        continue;
      }

      if (!geocodeResult) {
        failedClients.push({
          name: clientData.name,
          address: clientData.address,
          error: 'Geocoding result not found',
        });
        continue;
      }

      const clientId = randomUUID();
      const now = new Date().toISOString();

      const { error: insertError } = await supabase
        .from('clients')
        .insert({
          id: clientId,
          user_id: user.id,
          name: clientData.name,
          address: clientData.address,
          lat: geocodeResult.lat,
          lng: geocodeResult.lng,
          geocoded_at: now,
          is_active: true,
          created_at: now,
          updated_at: now,
        });

      if (insertError) {
        failedClients.push({
          name: clientData.name,
          address: clientData.address,
          error: insertError.message,
        });
        continue;
      }

      successfulClients.push({
        id: clientId,
        name: clientData.name,
        address: clientData.address,
        lat: geocodeResult.lat,
        lng: geocodeResult.lng,
        is_active: true,
        created_at: now,
      });
    }

    const result: ImportResult = {
      imported: successfulClients.length,
      failed: failedClients,
      clients: successfulClients,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Import clients error:', error);
    return NextResponse.json(
      { error: 'Failed to import clients' },
      { status: 500 }
    );
  }
}
