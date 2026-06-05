const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabase() {
  if (supabase) return supabase;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase storage is not configured');
  }
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  return supabase;
}

async function uploadFile(file) {
  const ext  = file.originalname.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const client = getSupabase();
  const { error } = await client.storage
    .from('tickets')
    .upload(path, file.buffer, { contentType: file.mimetype });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = client.storage.from('tickets').getPublicUrl(path);
  return data.publicUrl;
}

exports.uploadFile   = uploadFile;
exports.uploadTicket = uploadFile;
