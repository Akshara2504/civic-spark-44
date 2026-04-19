import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'imageBase64 required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

    const dataUri = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert forensic image analyst that detects AI-generated, synthetic, or manipulated images. Look for telltale signs: unnatural textures, inconsistent lighting, warped details (fingers, text, eyes), perfect symmetry, plastic-like skin, impossible physics, signs of diffusion-model artifacts, or watermarks from tools like Midjourney/DALL-E/Stable Diffusion. Be conservative — only flag images you are confident are synthetic. Real phone photos of streets, garbage, potholes, water leaks should be marked as real.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Is this image AI-generated or a real photograph? Respond using the tool.' },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'classify_image',
              description: 'Classify if an image is AI-generated.',
              parameters: {
                type: 'object',
                properties: {
                  is_ai_generated: { type: 'boolean', description: 'true if synthetic/AI-generated' },
                  confidence: { type: 'number', description: '0.0-1.0 confidence the image is AI-generated' },
                  reasoning: { type: 'string', description: 'Brief explanation of indicators observed' },
                },
                required: ['is_ai_generated', 'confidence', 'reasoning'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'classify_image' } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limited, try again shortly' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error('AI gateway error', response.status, t);
      // Fail-open: don't block the user
      return new Response(JSON.stringify({ is_ai_generated: false, confidence: 0, reasoning: 'check unavailable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result = { is_ai_generated: false, confidence: 0, reasoning: 'no result' };
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        // ignore
      }
    }

    console.log('AI image check:', JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('ai-image-check error', e);
    return new Response(JSON.stringify({ is_ai_generated: false, confidence: 0, reasoning: 'error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
