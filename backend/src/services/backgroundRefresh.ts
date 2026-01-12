import { supabase } from '../db/supabase.js';

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
  const mode = await detectDbMode();
  const resortsTable = mode === 'prisma' ? 'Resort' : 'resorts';

  const { data: resorts, error } = await supabase
    .from(resortsTable)
    .select('id')
    .order('updatedAt', { ascending: false } as any) // ok for prisma; ignored/errored for snake but harmless if missing column
    .limit(options?.maxResorts ?? 200);

  if (error && !isMissingTableError(error)) throw error;

  const ids = (resorts || []).map((r: any) => r.id).filter(Boolean);
  const baseUrl = options?.baseUrl || `http://127.0.0.1:${process.env.PORT || 3001}`;
  const delayMs = options?.delayMs ?? 500;

  let success = 0;
  let failed = 0;

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

    // Small delay to avoid hitting Gemini rate limits
    if (delayMs > 0) await sleep(delayMs);
  }

  return { total: ids.length, success, failed };
}

export function startBackgroundRefreshScheduler() {
  const enabled = process.env.REFRESH_SCHEDULER_ENABLED === 'true';
  if (!enabled) return;

  const everyHours = parseInt(process.env.REFRESH_INTERVAL_HOURS || '6', 10) || 6;
  const intervalMs = everyHours * 60 * 60 * 1000;

  console.log(`🕒 Background refresh scheduler enabled (every ${everyHours}h)`);

  // Run once shortly after startup
  setTimeout(() => {
    refreshAllCachedResorts({ delayMs: 750 }).then((r) => {
      console.log(`✅ Background refresh complete: ${r.success}/${r.total} ok (${r.failed} failed)`);
    }).catch((e) => {
      console.error('❌ Background refresh failed:', e);
    });
  }, 15_000);

  setInterval(() => {
    refreshAllCachedResorts({ delayMs: 750 }).then((r) => {
      console.log(`✅ Background refresh complete: ${r.success}/${r.total} ok (${r.failed} failed)`);
    }).catch((e) => {
      console.error('❌ Background refresh failed:', e);
    });
  }, intervalMs);
}

