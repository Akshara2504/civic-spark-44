import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find candidates: 0 upvotes, older than 24h, not SOS, not Resolved
    const { data: candidates, error: selErr } = await supabase
      .from('issues')
      .select('id, title, created_at, upvotes_count, sos_flag, status')
      .lte('created_at', cutoff)
      .eq('upvotes_count', 0)
      .eq('sos_flag', false)
      .neq('status', 'Resolved');

    if (selErr) throw selErr;

    const ids = (candidates || []).map((c) => c.id);
    console.log(`Found ${ids.length} stale issues to delete`);

    if (ids.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: 'No stale issues' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete dependent rows first (no FK cascades configured)
    await supabase.from('comments').delete().in('issue_id', ids);
    await supabase.from('votes').delete().in('issue_id', ids);
    await supabase.from('validations').delete().in('issue_id', ids);
    await supabase.from('sos_alerts').delete().in('issue_id', ids);
    await supabase.from('escalations').delete().in('issue_id', ids);

    const { error: delErr } = await supabase.from('issues').delete().in('id', ids);
    if (delErr) throw delErr;

    return new Response(
      JSON.stringify({ deleted: ids.length, ids }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('cleanup error', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
