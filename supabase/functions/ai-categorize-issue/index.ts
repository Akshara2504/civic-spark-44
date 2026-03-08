import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, imageBase64List } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a civic issue categorizer. Analyze the title, description, AND any images provided to determine the BEST matching category.

CATEGORY DEFINITIONS (use these EXACT names):
- "Roads & Transport": Potholes, road damage, traffic signals, broken roads, speed bumps, road construction, bridges, footpaths, cracked pavement
- "Water & Drainage": Water supply issues, water leakage, sewage overflow, drainage blockage, flooding, water contamination, broken pipes, clogged drains
- "Electricity": Power outage, streetlight not working, electrical hazard, transformer issues, loose wires, meter problems, fallen power lines
- "Waste Management": Garbage not collected, littering, overflowing dustbins, illegal dumping, waste burning, recycling issues, trash piles
- "Public Safety": Crime, accidents, fire hazard, unsafe structures, stray animals, vandalism, emergency situations, broken fences
- "Parks & Recreation": Park maintenance, broken playground equipment, overgrown areas, public space damage, damaged benches
- "Health & Sanitation": Public health concerns, mosquito breeding, open defecation, unhygienic conditions, stagnant water causing disease
- "Other": Anything that doesn't clearly fit the above categories

IMPORTANT RULES:
- If images are provided, analyze the visual content FIRST — images are the strongest signal
- A photo of a pothole → "Roads & Transport" regardless of text
- A photo of garbage/trash → "Waste Management"
- A photo of water flooding/leaking → "Water & Drainage"
- A photo of broken wires/dark streetlights → "Electricity"
- Even if title/description is vague, use the image to determine category
- Only use "Other" if NEITHER text NOR images give any clear signal
- Confidence should be 0.8+ when image clearly shows the issue type`;

    // Build user message content (text + images)
    const userContent: any[] = [];

    const textPart = `Title: ${title || 'Not provided'}\nDescription: ${description || 'Not provided'}`;
    userContent.push({ type: "text", text: textPart });

    // Add images if provided
    if (imageBase64List && Array.isArray(imageBase64List) && imageBase64List.length > 0) {
      for (const img of imageBase64List) {
        userContent.push({
          type: "image_url",
          image_url: { url: img }
        });
      }
      userContent.push({ type: "text", text: "\nAnalyze the above image(s) carefully to determine the civic issue category. What does the image show?" });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "categorize_issue",
              description: "Categorize a civic issue into the correct department category based on text and images",
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
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of why this category was chosen"
                  }
                },
                required: ["category", "confidence", "reasoning"],
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
      return new Response(
        JSON.stringify(keywordFallback(title, description)),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      if (!CATEGORIES.includes(result.category)) {
        result.category = "Other";
        result.confidence = 0.5;
      }
      console.log("AI categorization result:", result);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try parsing from content if tool call didn't work
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        if (CATEGORIES.includes(parsed.category)) {
          return new Response(
            JSON.stringify(parsed),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch { /* fall through */ }
    }

    return new Response(
      JSON.stringify(keywordFallback(title, description)),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-categorize-issue:", error);
    return new Response(
      JSON.stringify({ category: "Other", confidence: 0.5, reasoning: "Error occurred" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function keywordFallback(title: string, description: string): { category: string; confidence: number; reasoning: string } {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  if (/road|pothole|traffic|highway|bridge|footpath|speed bump|pavement/.test(text))
    return { category: "Roads & Transport", confidence: 0.8, reasoning: "Keyword match: road/transport related" };
  if (/water|drainage|sewage|pipe|leak|flood|tap|drain/.test(text))
    return { category: "Water & Drainage", confidence: 0.8, reasoning: "Keyword match: water/drainage related" };
  if (/electric|power|streetlight|transformer|wire|outage|light/.test(text))
    return { category: "Electricity", confidence: 0.8, reasoning: "Keyword match: electricity related" };
  if (/garbage|trash|waste|dustbin|litter|dump|recycl|rubbish/.test(text))
    return { category: "Waste Management", confidence: 0.8, reasoning: "Keyword match: waste related" };
  if (/safety|crime|fire|accident|vandal|stray|emergency|theft|danger/.test(text))
    return { category: "Public Safety", confidence: 0.8, reasoning: "Keyword match: safety related" };
  if (/park|playground|garden|recreation|bench|swing/.test(text))
    return { category: "Parks & Recreation", confidence: 0.8, reasoning: "Keyword match: parks related" };
  if (/health|mosquito|sanitation|disease|hygien|hospital|illness/.test(text))
    return { category: "Health & Sanitation", confidence: 0.8, reasoning: "Keyword match: health related" };
  
  return { category: "Other", confidence: 0.5, reasoning: "No clear category match found" };
}
