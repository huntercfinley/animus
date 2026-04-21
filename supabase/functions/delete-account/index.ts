import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS: '*' is acceptable for a mobile-only app — native clients don't send Origin headers.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401 });

    // User client — to verify identity
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const uid = user.id;

    // Admin client — service role can delete auth users
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete all user data (order matters for FK constraints)
    const { data: userDreams } = await adminClient.from('dreams').select('id').eq('user_id', uid);
    const dreamIds = (userDreams || []).map((d: any) => d.id);
    if (dreamIds.length > 0) {
      await adminClient.from('dream_conversations').delete().in('dream_id', dreamIds);
    }
    await adminClient.from('dream_symbols').delete().eq('user_id', uid);
    await adminClient.from('pattern_reports').delete().eq('user_id', uid);
    await adminClient.from('archetype_snapshots').delete().eq('user_id', uid);
    await adminClient.from('shadow_exercises').delete().eq('user_id', uid);
    await adminClient.from('world_entries').delete().eq('user_id', uid);
    await adminClient.from('usage_limits').delete().eq('user_id', uid);
    await adminClient.from('dreams').delete().eq('user_id', uid);
    await adminClient.from('profiles').delete().eq('id', uid);

    // Delete storage files
    for (const bucket of ['dream-images', 'dream-audio', 'user-photos']) {
      const { data: files } = await adminClient.storage.from(bucket).list(uid);
      if (files && files.length > 0) {
        await adminClient.storage.from(bucket).remove(files.map(f => `${uid}/${f.name}`));
      }
    }

    // Delete the auth user (requires service role)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(uid);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('delete-account error:', (err as Error).message);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
