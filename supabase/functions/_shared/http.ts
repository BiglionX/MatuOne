export const corsHeaders: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-action, x-parent-token',
  'access-control-allow-methods': 'POST, OPTIONS',
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders },
  })
}

export function empty(status: number): Response {
  return new Response(null, { status, headers: corsHeaders })
}
