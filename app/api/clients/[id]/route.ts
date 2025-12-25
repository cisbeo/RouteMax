import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clientUpdateSchema } from '@/lib/utils/validation';
import { geocodeAddress } from '@/lib/utils/geocode';
import type { Client } from '@/lib/types';
import type { Database } from '@/lib/types/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clientId = params.id;

    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    const validationResult = clientUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;
    let lat = existingClient.lat;
    let lng = existingClient.lng;
    let geocodedAt = existingClient.geocoded_at;

    if (updateData.address && updateData.address !== existingClient.address) {
      try {
        const geocodeResult = await geocodeAddress(updateData.address);
        lat = geocodeResult.lat;
        lng = geocodeResult.lng;
        geocodedAt = new Date().toISOString();
      } catch (error) {
        console.error('Geocoding error:', error);
        return NextResponse.json(
          {
            error: 'Failed to geocode address',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();

    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        name: updateData.name ?? existingClient.name,
        address: updateData.address ?? existingClient.address,
        lat,
        lng,
        geocoded_at: geocodedAt,
        is_active: updateData.is_active ?? existingClient.is_active,
        updated_at: now,
      })
      .eq('id', clientId)
      .select()
      .single();

    if (updateError || !updatedClient) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      );
    }

    const dbRow = updatedClient as Database['public']['Tables']['clients']['Row'];
    const client: Client = {
      id: dbRow.id,
      name: dbRow.name,
      address: dbRow.address,
      lat: dbRow.lat,
      lng: dbRow.lng,
      is_active: dbRow.is_active,
      created_at: dbRow.created_at,
    };

    return NextResponse.json({ client }, { status: 200 });
  } catch (error) {
    console.error('Update client error:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clientId = params.id;

    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('clients')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', clientId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete client' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete client error:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
