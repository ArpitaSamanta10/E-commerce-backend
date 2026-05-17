const { createClient } = require('@supabase/supabase-js');

let supabase = null;
let initError = null;

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function initSupabase() {
  if (supabase) return supabase;
  try {
    supabase = createSupabaseClient();
    initError = null;
    console.log('[supabase] Client initialized');
  } catch (err) {
    initError = err;
    console.error('[supabase] Init failed:', err.message);
    throw err;
  }
  return supabase;
}

function getSupabase() {
  if (supabase) return supabase;
  if (initError) throw initError;
  return initSupabase();
}

module.exports = { initSupabase, getSupabase, createSupabaseClient };
