import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const CATEGORIES = [
      "Roads & Transport",
      "Water & Drainage",
      "Electricity",
      "Waste Management",
      "Public Safety",
      "Parks & Recreation",
      "Health & Sanitation",
      "Other"
    ];

    const systemPrompt = `You are a civic issue categorizer. Given a title and description of a civic complaint, determine the BEST matching category.

CATEGORY DEFINITIONS (use these EXACT names):
- "Roads & Transport": Potholes, road damage, traffic signals, broken roads, speed bumps, road construction, bridges, footpaths
- "Water & Drainage": Water supply issues, water leakage, sewage overflow, drainage blockage, flooding, water contamination, broken pipes
- "Electricity": Power outage, streetlight not working, electrical hazard, transformer issues, loose wires, meter problems
- "Waste Management": Garbage not collected, littering, overflowing dustbins, illegal dumping, waste burning, recycling issues
- "Public Safety": Crime, accidents, fire hazard, unsafe structures, stray animals, vandalism, emergency situations
- "Parks & Recreation": Park maintenance, broken playground equipment, overgrown areas, public space damage
- "Health & Sanitation": Public health concerns, mosquito breeding, open defecation, unhygienic conditions, stagnant water causing disease
- "Other": Anything that doesn't clearly fit the above categories

RULES:
- Choose the SINGLE most relevant category
- Confidence should reflect how well the issue matches (0.5 = uncertain, 0.95 = very clear match)
- If garbage/trash/waste related → "Waste Management" (NOT "Health & Sanitation" unless disease-related)
- If road/pothole/traffic → "Roads & Transport"
- If water leak/pipe/drainage → "Water & Drainage"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${title || 'No title'}\nDescription: ${description || 'No description'}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "categorize_issue",
              description: "Categorize a civic issue into the correct department category",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: CATEGORIES,
                    description: "The category that best matches the civic issue"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0.5 and 0.99"
                  }
                },
                required: ["category", "confidence"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "categorize_issue" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Keyword fallback
      return new Response(
        JSON.stringify(keywordFallback(title, description)),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      // Validate category name
      if (!CATEGORIES.includes(result.category)) {
        result.category = "Other";
        result.confidence = 0.5;
      }
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback if tool call didn't work
    return new Response(
      JSON.stringify(keywordFallback(title, description)),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-categorize-issue:", error);
    return new Response(
      JSON.stringify({ category: "Other", confidence: 0.5 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function keywordFallback(title: string, description: string): { category: string; confidence: number } {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  if (/road|pothole|traffic|highway|bridge|footpath|speed bump/.test(text))
    return { category: "Roads & Transport", confidence: 0.8 };
  if (/water|drainage|sewage|pipe|leak|flood|tap/.test(text))
    return { category: "Water & Drainage", confidence: 0.8 };
  if (/electric|power|streetlight|transformer|wire|outage/.test(text))
    return { category: "Electricity", confidence: 0.8 };
  if (/garbage|trash|waste|dustbin|litter|dump|recycl/.test(text))
    return { category: "Waste Management", confidence: 0.8 };
  if (/safety|crime|fire|accident|vandal|stray|emergency|theft/.test(text))
    return { category: "Public Safety", confidence: 0.8 };
  if (/park|playground|garden|recreation|bench/.test(text))
    return { category: "Parks & Recreation", confidence: 0.8 };
  if (/health|mosquito|sanitation|disease|hygien|hospital/.test(text))
    return { category: "Health & Sanitation", confidence: 0.8 };
  
  return { category: "Other", confidence: 0.5 };
}
