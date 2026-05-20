const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function uploadFile(file) {
  const ext  = file.originalname.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('tickets')
    .upload(path, file.buffer, { contentType: file.mimetype });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('tickets').getPublicUrl(path);
  return data.publicUrl;
}

exports.uploadFile   = uploadFile;
exports.uploadTicket = uploadFile;
