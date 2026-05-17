const { formatSupabaseError } = require('../utils/supabaseError');

const TABLE = 'profiles';

async function ensureProfile(supabase, { id, email, full_name }) {
  if (!id) return { profile: null, skipped: true };

  const row = {
    id,
    email: email || null,
    full_name: full_name || null,
  };

  const { data: existing, error: readError } = await supabase
    .from(TABLE)
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (readError && readError.code !== 'PGRST116') {
    console.warn('[profileService] read profile:', readError.message);
  }

  if (existing) {
    return { profile: existing, created: false };
  }

  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();

  if (error) {
    if (error.code === '23505') {
      return { profile: row, created: false };
    }
    formatSupabaseError(error, 'ensureProfile');
    console.warn('[profileService] profile insert failed:', error.message);
    return { profile: null, error: error.message };
  }

  return { profile: data, created: true };
}

module.exports = { ensureProfile };
