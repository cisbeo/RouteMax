import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(
          errorDescription || 'An error occurred during authentication'
        )}`,
        request.url
      )
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=invalid_code', request.url));
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=exchange_failed&description=${encodeURIComponent(
            exchangeError.message
          )}`,
          request.url
        )
      );
    }

    return NextResponse.redirect(new URL('/dashboard/clients', request.url));
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL(
        '/auth/error?error=callback_error&description=An unexpected error occurred',
        request.url
      )
    );
  }
}
