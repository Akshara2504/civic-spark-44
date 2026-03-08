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

    const prompt = `Analyze this civic issue report and assess its severity CONSERVATIVELY.

ISSUE:
- Title: ${title || 'Not provided'}
- Description: ${description || 'Not provided'}
- Location: ${locationAddress || 'Not provided'}
- Coordinates: ${locationLat && locationLng ? `${locationLat}, ${locationLng}` : 'Not provided'}
- Images attached: ${mediaUrls?.length || 0}

MANDATORY SEVERITY SCALE - follow EXACTLY:
- severity_score 1-2: Minor inconvenience (noise, park maintenance, minor litter)
- severity_score 2-3: Routine civic issue (potholes, garbage not collected, broken streetlight, stray animals, graffiti)
- severity_score 3-4: Moderate issue (water pipe leak, blocked drain, damaged road, broken traffic sign)
- severity_score 4-5: Significant issue (traffic signal failure, minor flooding, large road damage)
- severity_score 5-6: Serious issue (sewage overflow, major road hazard, water supply disruption)
- severity_score 7-8: Emergency (exposed live wires in public area, gas leak, bridge damage, toxic spill)
- severity_score 9-10: Critical emergency (building collapse, fire, major structural failure with people at risk)

CRITICAL RULES:
- Garbage, waste, sanitation complaints = severity 2-3 MAX, NEVER higher
- Potholes, road issues = severity 2-3 MAX
- Water leaks, drainage = severity 3-4 MAX
- is_sos MUST be false unless severity_score >= 7
- ONLY life-threatening situations get severity >= 7
- Default assumption: the issue is routine (severity 2-3)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a strict civic issue severity assessor. You MUST use the tool to respond. Most issues are routine (severity 2-3). Only genuine life-threatening emergencies score 7+." },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assess_severity",
              description: "Assess the severity of a civic issue report. Most routine issues (garbage, potholes, streetlights) should score 2-3.",
              parameters: {
                type: "object",
                properties: {
                  is_sos: { type: "boolean", description: "true ONLY if severity_score >= 7 and there is immediate danger to life" },
                  severity_score: { type: "number", description: "1-10 scale. Most issues should be 2-4. Only life-threatening = 7+" },
                  severity_base: { type: "number", description: "1-5 scale. Most issues should be 2-3." },
                  reasoning: { type: "string", description: "Brief explanation of the severity assessment" },
                  risk_factors: { type: "array", items: { type: "string" }, description: "List of identified risks, empty if routine" },
                  estimated_affected_people: { type: "string", enum: ["none", "few", "moderate", "many", "critical"] },
                  time_sensitivity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  recommended_priority: { type: "string", enum: ["normal", "elevated", "high", "urgent", "critical"] }
                },
                required: ["is_sos", "severity_score", "severity_base", "reasoning", "risk_factors", "estimated_affected_people", "time_sensitivity", "recommended_priority"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "assess_severity" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify(defaultResult("AI analysis unavailable")),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract from tool call response
    let result;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content directly
      const content = data.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleaned);
    }

    // ENFORCE severity caps in code as a safety net
    let severityScore = Math.min(10, Math.max(1, Number(result.severity_score) || 3));
    let severityBase = Math.min(5, Math.max(1, Number(result.severity_base) || 2));
    
    // Check for known routine keywords - cap severity
    const lowerTitle = (title || '').toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    const combined = lowerTitle + ' ' + lowerDesc;
    
    const routineKeywords = ['garbage', 'trash', 'waste', 'litter', 'pothole', 'streetlight', 'street light', 
      'broken light', 'noise', 'park', 'graffiti', 'stray', 'parking', 'sidewalk', 'footpath',
      'dust', 'sweeping', 'cleaning', 'maintenance'];
    
    const isRoutine = routineKeywords.some(kw => combined.includes(kw));
    
    const emergencyKeywords = ['collapse', 'fire', 'burning', 'gas leak', 'explosion', 'electrocution',
      'live wire', 'exposed wire', 'toxic', 'chemical spill', 'flood', 'trapped', 'sinking', 'fatal'];
    
    const hasEmergencyKeyword = emergencyKeywords.some(kw => combined.includes(kw));
    
    if (isRoutine && !hasEmergencyKeyword) {
      severityScore = Math.min(severityScore, 4);
      severityBase = Math.min(severityBase, 3);
    }
    
    // Enforce: is_sos must match severity
    const isSos = severityScore >= 7 && hasEmergencyKeyword;

    const finalResult = {
      is_sos: isSos,
      severity_score: severityScore,
      severity_base: severityBase,
      reasoning: result.reasoning || "Assessment complete",
      risk_factors: isSos ? (result.risk_factors || []) : [],
      estimated_affected_people: result.estimated_affected_people || "few",
      time_sensitivity: result.time_sensitivity || "low",
      recommended_priority: result.recommended_priority || "normal",
    };

    console.log("Final severity result:", JSON.stringify(finalResult));

    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-sos-check:", error);
    return new Response(
      JSON.stringify(defaultResult("Analysis error")),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function defaultResult(reasoning: string) {
  return {
    is_sos: false,
    severity_score: 3,
    severity_base: 2,
    reasoning,
    risk_factors: [],
    estimated_affected_people: "few",
    time_sensitivity: "low",
    recommended_priority: "normal",
  };
}