import { NextResponse } from 'next/server'
import { analyzeDecision } from '@/lib/engine'

export const runtime = 'nodejs'

async function enrichWithAI(decision: string, base: ReturnType<typeof analyzeDecision>) {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL
  const model = process.env.AI_MODEL
  if (!apiKey || !baseUrl || !model) return { analysis: base, provider: 'branch-core' as const }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
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
          { role: 'system', content: 'You are BRANCH, a decision-structuring assistant. Return JSON only. Improve the supplied deterministic model without inventing facts. Keep options concise. Fields: summary, goal, risks (array max 4), assumptions (array max 4), dependencies (array max 5). Do not give medical, legal, financial or safety guarantees.' },
          { role: 'user', content: JSON.stringify({ decision, currentModel: base }) }
        ]
      })
    })
    if (!response.ok) throw new Error(`AI provider returned ${response.status}`)
    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('AI provider returned no content')
    const parsed = JSON.parse(content)
    const analysis = {
      ...base,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : base.summary,
      goal: typeof parsed.goal === 'string' ? parsed.goal.slice(0, 300) : base.goal,
      risks: Array.isArray(parsed.risks) ? parsed.risks.filter((x: unknown): x is string => typeof x === 'string').slice(0, 4) : base.risks,
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((x: unknown): x is string => typeof x === 'string').slice(0, 4) : base.assumptions,
      dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies.filter((x: unknown): x is string => typeof x === 'string').slice(0, 5) : base.dependencies,
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
