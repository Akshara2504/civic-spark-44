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

    const prompt = `You are a STRICT and CONSERVATIVE civic issue severity assessor. Your job is to assign LOW severity scores to routine problems.

ISSUE TO ASSESS:
- Title: ${title || 'Not provided'}
- Description: ${description || 'Not provided'}
- Location: ${locationAddress || 'Not provided'}
- Coordinates: ${locationLat && locationLng ? `${locationLat}, ${locationLng}` : 'Not provided'}
- Images attached: ${mediaUrls?.length || 0}

SEVERITY SCALE - BE VERY STRICT:
- severity_score 1: Cosmetic/trivial (minor graffiti, small litter, cosmetic damage)
- severity_score 2: Minor inconvenience (noise complaint, park bench needs paint, minor litter, dust)
- severity_score 3: Routine civic issue (pothole, garbage not collected, broken streetlight, stray animals, graffiti, parking issue, footpath crack)
- severity_score 4: Moderate issue (water pipe leak, blocked drain, damaged road section, broken traffic sign, overflowing dustbin)
- severity_score 5: Significant issue (traffic signal failure at busy junction, minor flooding, large road damage affecting traffic)
- severity_score 6: Serious issue (sewage overflow in residential area, major road hazard, water supply cut to area)
- severity_score 7: Dangerous (exposed live wires in public, small gas leak, bridge structural damage)
- severity_score 8: Emergency (large gas leak, toxic chemical spill, major structural failure)
- severity_score 9-10: Critical life-threatening emergency (building collapse with people inside, active fire spreading, mass casualty situation)

CRITICAL RULES YOU MUST FOLLOW:
1. DEFAULT assumption: every issue is routine = severity 2-3
2. Garbage, waste, trash, litter, dustbin = severity 2-3, NEVER above 4
3. Potholes, road cracks, bumps = severity 2-3, NEVER above 4
4. Streetlight, broken light = severity 2-3, NEVER above 3
5. Noise, parking, minor maintenance = severity 1-2
6. Water leak (minor) = severity 3-4
7. Stray animals, graffiti = severity 2
8. is_sos MUST be false unless severity_score >= 7
9. severity_base should be 1-3 for most issues, max 5 only for true emergencies
10. When in doubt, go LOWER not higher
11. Do NOT inflate severity just because the reporter sounds urgent or emotional`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You assess civic issue severity CONSERVATIVELY. Most issues are mundane and routine (severity 2-3). You almost never assign severity above 5. Only genuine life-threatening emergencies get 7+. You MUST use the tool to respond." },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assess_severity",
              description: "Assess severity of a civic issue. Most routine issues (garbage, potholes, streetlights, noise) = severity 2-3. Only life-threatening = 7+.",
              parameters: {
                type: "object",
                properties: {
                  is_sos: { type: "boolean", description: "true ONLY if severity_score >= 7 AND there is immediate danger to human life" },
                  severity_score: { type: "number", description: "1-10. Most issues = 2-3. Above 5 is rare. Above 7 is almost never." },
                  severity_base: { type: "number", description: "1-5. Most issues = 1-2. Only emergencies = 4-5." },
                  reasoning: { type: "string", description: "Brief explanation" },
                  risk_factors: { type: "array", items: { type: "string" }, description: "List of risks, empty for routine issues" },
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
    
    let result;
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleaned);
    }

    let severityScore = Math.min(10, Math.max(1, Number(result.severity_score) || 2));
    let severityBase = Math.min(5, Math.max(1, Number(result.severity_base) || 2));
    
    // Keyword-based severity caps - STRICT enforcement
    const combined = `${(title || '').toLowerCase()} ${(description || '').toLowerCase()}`;
    
    // Tier 1: Very minor issues - cap at 2
    const trivialKeywords = ['noise', 'graffiti', 'stray', 'parking', 'paint', 'bench', 'sweeping', 'dust', 'cosmetic'];
    const isTrivial = trivialKeywords.some(kw => combined.includes(kw));
    
    // Tier 2: Routine issues - cap at 3
    const routineKeywords = ['garbage', 'trash', 'waste', 'litter', 'pothole', 'streetlight', 'street light', 
      'broken light', 'park', 'footpath', 'sidewalk', 'dustbin', 'cleaning', 'maintenance',
      'dumping', 'rubbish', 'recycle', 'collection', 'smell', 'stink', 'dirty', 'unclean'];
    const isRoutine = routineKeywords.some(kw => combined.includes(kw));
    
    // Tier 3: Moderate issues - cap at 5
    const moderateKeywords = ['leak', 'pipe', 'drain', 'blocked', 'clogged', 'overflow', 'road damage',
      'traffic sign', 'signal', 'waterlog'];
    const isModerate = moderateKeywords.some(kw => combined.includes(kw));
    
    // Emergency keywords - only these can go above 5
    const emergencyKeywords = ['collapse', 'fire', 'burning', 'gas leak', 'explosion', 'electrocution',
      'live wire', 'exposed wire', 'toxic', 'chemical spill', 'flood', 'trapped', 'sinking', 'fatal',
      'death', 'dying', 'killed', 'crushed', 'building fall', 'bridge fall'];
    const hasEmergencyKeyword = emergencyKeywords.some(kw => combined.includes(kw));
    
    // Apply caps strictly
    if (!hasEmergencyKeyword) {
      if (isTrivial) {
        severityScore = Math.min(severityScore, 2);
        severityBase = Math.min(severityBase, 1);
      } else if (isRoutine) {
        severityScore = Math.min(severityScore, 3);
        severityBase = Math.min(severityBase, 2);
      } else if (isModerate) {
        severityScore = Math.min(severityScore, 5);
        severityBase = Math.min(severityBase, 3);
      } else {
        // Unknown issue type without emergency keywords - default cap at 4
        severityScore = Math.min(severityScore, 4);
        severityBase = Math.min(severityBase, 2);
      }
    }
    
    // Enforce: is_sos must match severity
    const isSos = severityScore >= 7 && hasEmergencyKeyword;

    // Enforce priority consistency
    let recommendedPriority = result.recommended_priority || "normal";
    let timeSensitivity = result.time_sensitivity || "low";
    if (severityScore <= 3) {
      recommendedPriority = "normal";
      timeSensitivity = "low";
    } else if (severityScore <= 5) {
      if (recommendedPriority === "critical" || recommendedPriority === "urgent") recommendedPriority = "elevated";
      if (timeSensitivity === "critical") timeSensitivity = "medium";
    }

    const finalResult = {
      is_sos: isSos,
      severity_score: severityScore,
      severity_base: severityBase,
      reasoning: result.reasoning || "Assessment complete",
      risk_factors: isSos ? (result.risk_factors || []) : [],
      estimated_affected_people: result.estimated_affected_people || "few",
      time_sensitivity: timeSensitivity,
      recommended_priority: recommendedPriority,
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
    severity_score: 2,
    severity_base: 1,
    reasoning,
    risk_factors: [],
    estimated_affected_people: "few",
    time_sensitivity: "low",
    recommended_priority: "normal",
  };
}
