import { supabase } from '../db/supabase.js';
import { onTheSnowScraper } from './onTheSnow.js';

type DbMode = 'snake' | 'prisma';
let dbMode: DbMode | null = null;

function isMissingTableError(error: any): boolean {
  return (
    error &&
    typeof error === 'object' &&
    (error.code === 'PGRST205' ||
      (typeof error.message === 'string' && error.message.includes('Could not find the table')))
  );
}

async function detectDbMode(): Promise<DbMode> {
  if (dbMode) return dbMode;
  const snakeProbe = await supabase.from('resorts').select('id').limit(1);
  if (!snakeProbe.error) {
    dbMode = 'snake';
    return dbMode;
  }
  if (isMissingTableError(snakeProbe.error)) {
    const prismaProbe = await supabase.from('Resort').select('id').limit(1);
    if (!prismaProbe.error) {
      dbMode = 'prisma';
      return dbMode;
    }
  }
  dbMode = 'snake';
  return dbMode;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Discover new resorts from OnTheSnow and populate DB if missing
 */
export async function populateKnownResorts() {
  console.log('[Discovery] Starting resort discovery from OnTheSnow...');
  const discovered = await onTheSnowScraper.discoverResorts();
  const mode = await detectDbMode();
  const resortsTable = mode === 'prisma' ? 'Resort' : 'resorts';
  
  let newCount = 0;
  
  for (const resort of discovered) {
    const id = resort.url.split('/').slice(-2, -1)[0]; // e.g. /colorado/vail/skireport -> vail
    if (!id) continue;
    
    // Check if exists
    const { data } = await supabase.from(resortsTable).select('id').eq('id', id).maybeSingle();
    if (!data) {
      // Insert placeholder
      const now = new Date().toISOString();
      const payload = mode === 'prisma' ? {
        id,
        name: resort.name,
        location: resort.region, // temporary
        state: resort.region === 'colorado' ? 'CO' : 'US', // simple mapping
        region: 'Other',
        latitude: 0,
        longitude: 0,
        websiteUrl: resort.url,
        updatedAt: now
      } : {
        id,
        name: resort.name,
        location: resort.region,
        state: resort.region === 'colorado' ? 'CO' : 'US',
        region: 'Other',
        website_url: resort.url,
        updated_at: now
      };
      
      const { error } = await supabase.from(resortsTable).insert(payload);
      if (!error) {
        newCount++;
        console.log(`[Discovery] Added new resort: ${id}`);
      } else {
        console.error(`[Discovery] Failed to add ${id}:`, error);
      }
    }
  }
  console.log(`[Discovery] Finished. Added ${newCount} new resorts.`);
}

/**
 * Refresh all resorts already present in the database by calling the existing
 * backend endpoint `GET /api/resorts/:id?refresh=true` in-process.
 *
 * This keeps the logic centralized in the route handler and avoids duplicating
 * upsert logic in multiple places.
 */
export async function refreshAllCachedResorts(options?: {
  baseUrl?: string;
  maxResorts?: number;
  delayMs?: number;
}): Promise<{ total: number; success: number; failed: number }> {
  // First, ensure we have resorts
  // Only run discovery if explicitly requested or if we have very few resorts? 
  // For now, let's keep discovery manual or periodic, but the refresh loop just refreshes what we have.
  
  const mode = await detectDbMode();
  const resortsTable = mode === 'prisma' ? 'Resort' : 'resorts';

  const { data: resorts, error } = await supabase
    .from(resortsTable)
    .select('id')
    .order('updatedAt', { ascending: false } as any) // ok for prisma; ignored/errored for snake but harmless if missing column
    .limit(options?.maxResorts ?? 500); // Increased limit for "all"

  if (error && !isMissingTableError(error)) throw error;

  const ids = (resorts || []).map((r: any) => r.id).filter(Boolean);
  const baseUrl = options?.baseUrl || `http://127.0.0.1:${process.env.PORT || 3001}`;
  const delayMs = options?.delayMs ?? 1000; // Increased delay to be polite to OnTheSnow

  let success = 0;
  let failed = 0;

  console.log(`[Refresh] Starting refresh for ${ids.length} resorts...`);

  for (const id of ids) {
    try {
      const url = `${baseUrl}/api/resorts/${encodeURIComponent(id)}?refresh=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      success++;
    } catch (e) {
      failed++;
      console.error(`[refreshAllCachedResorts] failed for ${id}:`, e);
    }

    // Delay to avoid rate limits
    if (delayMs > 0) await sleep(delayMs);
  }

  return { total: ids.length, success, failed };
}

export function startBackgroundRefreshScheduler() {
  const enabled = process.env.REFRESH_SCHEDULER_ENABLED === 'true';
  if (!enabled) return;

  // Default to 1 hour (user request)
  const everyHours = parseInt(process.env.REFRESH_INTERVAL_HOURS || '1', 10) || 1;
  const intervalMs = everyHours * 60 * 60 * 1000;

  console.log(`🕒 Background refresh scheduler enabled (every ${everyHours}h)`);

  // Run once shortly after startup
  setTimeout(() => {
    // Optionally run discovery on startup? 
    // Maybe not every time, it's heavy.
    refreshAllCachedResorts({ delayMs: 1000 }).then((r) => {
      console.log(`✅ Background refresh complete: ${r.success}/${r.total} ok (${r.failed} failed)`);
    }).catch((e) => {
      console.error('❌ Background refresh failed:', e);
    });
  }, 15_000);

  setInterval(() => {
    refreshAllCachedResorts({ delayMs: 1000 }).then((r) => {
      console.log(`✅ Background refresh complete: ${r.success}/${r.total} ok (${r.failed} failed)`);
    }).catch((e) => {
      console.error('❌ Background refresh failed:', e);
    });
  }, intervalMs);
}
