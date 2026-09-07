import { NextResponse } from 'next/server'
import { analyzeDecision } from '@/lib/engine'

export const runtime = 'nodejs'

function stringArray(value: unknown, limit: number) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim()).slice(0, limit) : null
}

async function enrichWithAI(decision: string, base: ReturnType<typeof analyzeDecision>) {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL
  const model = process.env.AI_MODEL
  if (!apiKey || !baseUrl || !model || base.contextQuality !== 'ready') return { analysis: base, provider: 'branch-core' as const }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.15,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are BRANCH, a careful decision-simulation analyst. Return JSON only. Use ONLY facts and choices present in the supplied decision model. Do not invent options, events, people, probabilities, or facts. The user wants exploration, not a generic motivational answer. When there is enough context, choose one existing option as a CONDITIONAL recommendation based on the user's explicit goal and preferences. Never claim certainty. Explain the recommendation in concrete terms and state what would change it. Keep recommendations actionable but not prescriptive for medical, legal, financial, or safety decisions. JSON fields: summary string, goal string, risks string[] max 4, assumptions string[] max 4, dependencies string[] max 5, recommendation string, recommendationReason string, nextStep string.`
          },
          { role: 'user', content: JSON.stringify({ decision, currentModel: base }) }
        ]
      })
    })
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`)
    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('AI provider returned no content')
    const parsed = JSON.parse(content)
    const recommendation = typeof parsed.recommendation === 'string' && base.options.includes(parsed.recommendation) ? parsed.recommendation : base.recommendation
    const analysis = {
      ...base,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : base.summary,
      goal: typeof parsed.goal === 'string' ? parsed.goal.slice(0, 300) : base.goal,
      risks: stringArray(parsed.risks, 4) ?? base.risks,
      assumptions: stringArray(parsed.assumptions, 4) ?? base.assumptions,
      dependencies: stringArray(parsed.dependencies, 5) ?? base.dependencies,
      recommendation,
      recommendationReason: recommendation === base.recommendation && typeof parsed.recommendationReason === 'string' ? parsed.recommendationReason.slice(0, 500) : base.recommendationReason,
      nextStep: typeof parsed.nextStep === 'string' ? parsed.nextStep.slice(0, 300) : base.nextStep,
    }
    return { analysis, provider: 'ai-enriched' as const }
  } catch {
    return { analysis: base, provider: 'branch-core' as const }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const decision = typeof body?.decision === 'string' ? body.decision.trim() : ''
    if (decision.length < 20) return NextResponse.json({ error: 'Describe the decision in at least 20 characters.' }, { status: 400 })
    if (decision.length > 6000) return NextResponse.json({ error: 'Keep the decision context under 6,000 characters.' }, { status: 400 })

    const base = analyzeDecision(decision)
    const result = await enrichWithAI(decision, base)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to analyze this decision right now. Your decision was not saved.' }, { status: 500 })
  }
}
