/**
 * Supabase Client for SnowPeak Backend
 * 
 * Uses service role key for backend operations (bypasses RLS)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && (supabaseServiceKey || supabaseAnonKey));
};

let supabaseInstance: SupabaseClient;

if (isSupabaseConfigured()) {
  // Use service role key for backend (bypasses Row Level Security)
  // Fall back to anon key if service key not available
  const key = supabaseServiceKey || supabaseAnonKey;
  
  supabaseInstance = createClient(supabaseUrl!, key!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  console.log('✅ Supabase client initialized');
} else {
  console.warn('⚠️ Supabase environment variables missing!');
  console.warn('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  console.warn('   Falling back to mock client...');
  
  // Create a mock client for development without Supabase
  const createMockResponse = (data: unknown = null, error: unknown = null) => 
    Promise.resolve({ data, error, count: 0 });
  
  const createMockChain = (): unknown => ({
    select: () => createMockChain(),
    insert: () => createMockResponse(null, { message: 'Supabase not configured' }),
    update: () => createMockResponse(null, { message: 'Supabase not configured' }),
    upsert: () => createMockResponse(null, { message: 'Supabase not configured' }),
    delete: () => createMockResponse(null, { message: 'Supabase not configured' }),
    eq: () => createMockChain(),
    neq: () => createMockChain(),
    gt: () => createMockChain(),
    gte: () => createMockChain(),
    lt: () => createMockChain(),
    lte: () => createMockChain(),
    like: () => createMockChain(),
    ilike: () => createMockChain(),
    is: () => createMockChain(),
    in: () => createMockChain(),
    or: () => createMockChain(),
    order: () => createMockChain(),
    limit: () => createMockChain(),
    range: () => createMockChain(),
    single: () => createMockResponse(null, { code: 'PGRST116', message: 'Not found' }),
    maybeSingle: () => createMockResponse(null),
    then: (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null }),
  });
  
  supabaseInstance = {
    from: () => createMockChain(),
    rpc: () => createMockResponse([]),
    storage: {
      from: () => ({
        upload: () => createMockResponse(null, { message: 'Supabase not configured' }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => createMockResponse(null),
      }),
    },
    auth: {
      getSession: () => createMockResponse({ session: null }),
      getUser: () => createMockResponse({ user: null }),
      signInWithPassword: () => createMockResponse(null, { message: 'Supabase not configured' }),
      signOut: () => createMockResponse(null),
    },
  } as unknown as SupabaseClient;
}

export const supabase = supabaseInstance;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get today's date as ISO string (for date comparisons)
 * Uses local date to avoid timezone issues
 */
export function getToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date N hours ago
 */
export function getHoursAgo(hours: number): string {
  const date = new Date(Date.now() - hours * 60 * 60 * 1000);
  return date.toISOString();
}

/**
 * Get date N days from now
 */
export function getDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Format date as MM/DD
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Get day name from date
 */
export function getDayName(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}
