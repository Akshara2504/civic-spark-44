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

    const prompt = `You are a STRICT and CONSERVATIVE AI emergency detection system for a civic issue reporting platform. Your job is to realistically assess severity. MOST issues are NOT emergencies.

ISSUE DETAILS:
- Title: ${title || 'Not provided'}
- Description: ${description || 'Not provided'}
- Location: ${locationAddress || 'Not provided'}
- Coordinates: ${locationLat && locationLng ? `${locationLat}, ${locationLng}` : 'Not provided'}
- Number of images attached: ${mediaUrls?.length || 0}

SEVERITY CALIBRATION (follow these examples strictly):
- Pothole on road → severity 2-3, NOT SOS
- Broken streetlight → severity 2, NOT SOS
- Garbage not collected → severity 2-3, NOT SOS
- Water leakage from pipe → severity 3-4, NOT SOS
- Drainage blocked → severity 3-4, NOT SOS
- Road damage / cracks → severity 2-3, NOT SOS
- Stray animal nuisance → severity 2, NOT SOS
- Noise complaint → severity 1-2, NOT SOS
- Park maintenance needed → severity 1-2, NOT SOS
- Traffic signal not working → severity 4-5, NOT SOS
- Minor flooding in street → severity 4-5, NOT SOS
- Large sinkhole on busy road → severity 6-7, MAYBE SOS
- Gas leak detected → severity 8-9, SOS
- Building collapse / structural failure → severity 9-10, SOS
- Live exposed electrical wires in public → severity 8-9, SOS
- Major water contamination → severity 8-9, SOS
- Fire in residential area → severity 9-10, SOS
- Bridge structural damage → severity 7-8, SOS

RULES:
1. Default severity should be 2-4 for routine civic issues
2. Only rate severity >= 7 if there is IMMEDIATE danger to human life or health
3. Severity 5-6 is for significant but non-life-threatening issues
4. MOST reports are routine (potholes, garbage, lights) and should score 2-4
5. Do NOT inflate severity just because the reporter sounds urgent
6. Vague descriptions without clear danger indicators = low severity

EVALUATION CRITERIA (rate each 0-5):
1. Life Threat: Immediate danger to human life?
2. Health Hazard: Immediate health risk?
3. Scale of Impact: How many people affected?
4. Time Sensitivity: Will delay cause irreversible harm?
5. Vulnerability: Are vulnerable populations at risk?
6. Infrastructure Criticality: Is critical infrastructure compromised?

Respond with ONLY valid JSON:
{
  "is_sos": boolean,
  "severity_score": number (1-10, most issues should be 2-4),
  "severity_base": number (1-5, most issues should be 2-3),
  "reasoning": "Brief explanation",
  "risk_factors": ["list of identified risks, empty array if none"],
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
          { role: "system", content: "You are a STRICT and CONSERVATIVE emergency detection AI. Respond with valid JSON only. MOST civic issues (potholes, garbage, streetlights, drainage, water leaks) are routine and MUST score severity 2-4. Only flag genuine life-threatening emergencies (gas leaks, building collapse, fires, exposed electrical wires, toxic spills) as SOS with severity >= 7. Default to LOW severity. When uncertain, always rate LOWER not higher." },
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
