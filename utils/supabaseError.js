function formatSupabaseError(error, context = '') {
  if (!error) return null;

  const prefix = context ? `[${context}] ` : '';
  const message = error.message || 'Database error';
  const code = error.code || 'UNKNOWN';

  console.error(`${prefix}Supabase error (${code}):`, message, error.details || '');

  let status = 500;
  if (code === 'PGRST116') status = 404;
  else if (code === 'PGRST205' || code === '42P01') status = 503;
  else if (code.startsWith('PGRST') || code.startsWith('42') || code.startsWith('23')) status = 400;

  return { status, message, code };
}

module.exports = { formatSupabaseError };
