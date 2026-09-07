import { NextResponse } from 'next/server'
import { analyzeDecision } from '@/lib/engine'

export const runtime = 'nodejs'

function stringArray(value: unknown, limit: number) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim()).slice(0, limit) : null
}

function safeText(value: unknown, fallback: string, limit = 900) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : fallback
}

function parseModelContent(content: unknown) {
  if (typeof content !== 'string') return null
  try { return JSON.parse(content) } catch {
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]
    if (!fenced) return null
    try { return JSON.parse(fenced) } catch { return null }
  }
}

async function enrichWithAI(decision: string, base: ReturnType<typeof analyzeDecision>) {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL
  const model = process.env.AI_MODEL
  if (!apiKey || !baseUrl || !model) return { analysis: base, provider: 'branch-core' as const, aiActive: false, understanding: base.summary, assistantMessage: base.summary, clarifyingQuestions: base.missingContext, confidenceLabel: base.contextQuality === 'ready' ? 'ready' : 'developing' }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are BRANCH, the intelligence layer inside an AI decision-simulation product. Understand the user's actual intent before modeling anything.

Rules:
- Interpret natural language, slang, fragments, typos, short questions, statements, comparisons, and conversational wording.
- Never invent a decision, option, fact, event, person, probability, or constraint.
- Never turn random nouns, names, filler words, or slang into variables.
- A goal or outcome is not automatically a decision.
- If input is incomplete, do not reject it. Explain what you understood and ask only for the specific missing context needed.
- If the user says “I want to move abroad”, understand that as relocation intent, not as a complete decision. Ask where/which paths, purpose, priorities, timing, constraints, and key uncertainty as needed.
- If the user says “Should I go to USA or Australia?”, recognize USA and Australia as actual paths, but do not recommend until the purpose and important priorities/constraints are known.
- If the model is ready, discuss the actual paths, consequences, trade-offs, dependencies, and what would change the recommendation.
- Recommendations are conditional, never guaranteed.
- Never use arbitrary 0-100 scores as a substitute for reasoning.
- Treat the deterministic BRANCH model as authoritative for its structured options and variables. Do not overwrite it with invented information.
- Clearly distinguish user-provided facts from assumptions.
- For high-stakes topics, remain informational and avoid pretending to provide professional advice.

Return JSON only with: intent, understanding, assistantMessage, clarifyingQuestions, summary, goal, risks, assumptions, recommendation, recommendationReason, nextStep, confidenceLabel.
intent must be one of: decision, comparison, planning, goal, outcome, question, statement, incomplete_decision, irrelevant_or_unclear.
clarifyingQuestions must contain at most 6 specific questions and be empty when enough context exists.
recommendation must be empty unless the deterministic model is ready and the recommendation matches one of its existing options.
Make assistantMessage sound like a careful human analyst who listened to the user's exact words. Never say only “provide more details” when you can name exactly what is missing.`
          },
          {
            role: 'user',
            content: JSON.stringify({ userInput: decision, deterministicModel: base, modelState: base.contextQuality })
          }
        ]
      })
    })
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`)
    const json = await response.json()
    const parsed = parseModelContent(json?.choices?.[0]?.message?.content)
    if (!parsed) throw new Error('AI provider returned invalid content')

    const aiRecommendation = typeof parsed.recommendation === 'string' && base.options.includes(parsed.recommendation) ? parsed.recommendation : ''
    const recommendation = aiRecommendation || base.recommendation
    const analysis = {
      ...base,
      summary: safeText(parsed.summary, base.summary, 600),
      goal: safeText(parsed.goal, base.goal, 300),
      risks: stringArray(parsed.risks, 4) ?? base.risks,
      assumptions: stringArray(parsed.assumptions, 4) ?? base.assumptions,
      dependencies: base.dependencies,
      recommendation,
      recommendationReason: recommendation ? safeText(parsed.recommendationReason, base.recommendationReason, 700) : '',
      nextStep: safeText(parsed.nextStep, base.nextStep, 400),
    }

    return {
      analysis,
      provider: 'ai-enriched' as const,
      aiActive: true,
      model,
      intent: safeText(parsed.intent, base.contextQuality === 'ready' ? 'decision' : 'incomplete_decision', 40),
      understanding: safeText(parsed.understanding, base.summary, 700),
      assistantMessage: safeText(parsed.assistantMessage, base.summary, 1200),
      clarifyingQuestions: stringArray(parsed.clarifyingQuestions, 6) ?? [],
      confidenceLabel: safeText(parsed.confidenceLabel, base.contextQuality === 'ready' ? 'ready' : 'developing', 30),
    }
  } catch {
    return {
      analysis: base,
      provider: 'branch-core' as const,
      aiActive: false,
      understanding: base.summary,
      assistantMessage: base.contextQuality === 'ready' ? base.recommendationReason : 'I understand the direction of your decision, but I need a little more context before I can model it without inventing choices or conclusions.',
      clarifyingQuestions: base.missingContext,
      confidenceLabel: base.contextQuality === 'ready' ? 'ready' : 'developing'
    }
  } finally { clearTimeout(timeout) }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const decision = typeof body?.decision === 'string' ? body.decision.trim() : ''
    if (decision.length < 20) return NextResponse.json({ error: 'Tell BRANCH a little more about what is on your mind.' }, { status: 400 })
    if (decision.length > 6000) return NextResponse.json({ error: 'Keep the decision context under 6,000 characters.' }, { status: 400 })
    const base = analyzeDecision(decision)
    const result = await enrichWithAI(decision, base)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Unable to analyze this input right now. Your decision was not saved.' }, { status: 500 }) }
}
