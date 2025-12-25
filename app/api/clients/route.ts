import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paginationSchema } from '@/lib/utils/validation';
import type { Client } from '@/lib/types';
import type { Database } from '@/lib/types/database';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const queryParams = {
      page: url.searchParams.get('page'),
      limit: url.searchParams.get('limit'),
      active_only: url.searchParams.get('active_only'),
    };

    const validationResult = paginationSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid pagination parameters',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { page, limit, active_only } = validationResult.data;
    const offset = (page - 1) * limit;

    let countQuery = supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (active_only) {
      countQuery = countQuery.eq('is_active', true);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
      return NextResponse.json(
        { error: 'Failed to fetch clients count' },
        { status: 500 }
      );
    }

    let dataQuery = supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id);

    if (active_only) {
      dataQuery = dataQuery.eq('is_active', true);
    }

    const { data: rawClients, error: clientsError } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (clientsError) {
      console.error('Clients fetch error:', clientsError);
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      );
    }

    const clients: Client[] = (rawClients || []).map((row) => {
      const dbRow = row as Database['public']['Tables']['clients']['Row'];
      return {
        id: dbRow.id,
        name: dbRow.name,
        address: dbRow.address,
        lat: dbRow.lat,
        lng: dbRow.lng,
        is_active: dbRow.is_active,
        created_at: dbRow.created_at,
      };
    });

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json(
      {
        clients,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get clients error:', error);
    return NextResponse.json(
      { error: 'Failed to get clients' },
      { status: 500 }
    );
  }
}
