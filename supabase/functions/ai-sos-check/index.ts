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
    const { title, description, locationAddress, locationLat, locationLng, mediaUrls } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are an AI emergency detection system for a civic issue reporting platform. Analyze the following reported issue and determine if it qualifies as an EMERGENCY (SOS).

ISSUE DETAILS:
- Title: ${title || 'Not provided'}
- Description: ${description || 'Not provided'}
- Location: ${locationAddress || 'Not provided'}
- Coordinates: ${locationLat && locationLng ? `${locationLat}, ${locationLng}` : 'Not provided'}
- Number of images attached: ${mediaUrls?.length || 0}

EVALUATION CRITERIA:
1. **Life Threat**: Does the issue pose immediate danger to human life? (e.g., building collapse, gas leak, flooding, fire, exposed live wires, open manholes on busy roads)
2. **Health Hazard**: Is there an immediate health risk? (e.g., contaminated water supply, sewage overflow in residential areas, toxic spills)
3. **Scale of Impact**: How many people are potentially affected? (single household vs entire neighborhood/area)
4. **Time Sensitivity**: Will delay cause irreversible harm? (e.g., rising floodwater vs a pothole)
5. **Vulnerability**: Are vulnerable populations at risk? (near schools, hospitals, elderly housing)
6. **Infrastructure Criticality**: Is critical infrastructure compromised? (main water line, power grid, bridge)

SCORING:
- Rate each criterion 0-5
- Calculate overall severity (1-10 scale)
- If severity >= 7, classify as SOS/Emergency

You MUST respond with ONLY a valid JSON object:
{
  "is_sos": boolean,
  "severity_score": number (1-10),
  "severity_base": number (1-5),
  "reasoning": "Brief explanation of why this is/isn't an emergency",
  "risk_factors": ["list", "of", "identified", "risks"],
  "estimated_affected_people": "none/few/moderate/many/critical",
  "time_sensitivity": "low/medium/high/critical",
  "recommended_priority": "normal/elevated/high/urgent/critical"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an emergency detection AI. Always respond with valid JSON only. Be conservative - only flag true emergencies as SOS to avoid alert fatigue, but never miss genuinely dangerous situations." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          is_sos: false, 
          severity_score: 3, 
          severity_base: 3,
          reasoning: "AI analysis unavailable, defaulting to normal priority",
          risk_factors: [],
          estimated_affected_people: "unknown",
          time_sensitivity: "medium",
          recommended_priority: "normal"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Clean potential markdown code fences
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleaned);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-sos-check:", error);
    return new Response(
      JSON.stringify({ 
        is_sos: false, 
        severity_score: 3, 
        severity_base: 3,
        reasoning: "Analysis error, defaulting to normal priority",
        risk_factors: [],
        estimated_affected_people: "unknown",
        time_sensitivity: "medium",
        recommended_priority: "normal"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
