export type Variable = {
  name: string
  impact: number
  value: number
  low: number
  high: number
  direction: 'positive' | 'negative' | 'neutral'
}

export type Analysis = {
  title: string
  summary: string
  goal: string
  options: string[]
  variables: Variable[]
  risks: string[]
  assumptions: string[]
  dependencies: string[]
  confidence: number
}

const STOP = new Set(['the','and','that','with','from','this','have','will','would','should','could','into','about','there','their','then','than','for','are','was','were','you','your','our','what','when','where','which','because','while','using','need','want','make','more','less','also','just','very','some','like','over','under','after','before','between'])
const NEGATIVE = new Set(['cost','price','time','deadline','risk','uncertainty','competition','effort','complexity','budget'])
const POSITIVE = new Set(['demand','revenue','adoption','quality','readiness','capacity','resources','team','experience','growth','retention','support','reliability','accuracy'])

function cleanTerms(text: string) {
  return [...new Set((text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []).filter(w => !STOP.has(w)))]
}

function titleFrom(input: string) {
  const sentence = input.split(/[.!?]/)[0].trim()
  return sentence.length > 72 ? `${sentence.slice(0, 69)}…` : sentence || 'Your decision'
}

function extractOptions(input: string) {
  const patterns = [
    /(?:choose between|between|either)\s+([^.!?]+?)\s+(?:or|vs\.?|versus)\s+([^.!?]+)/gi,
    /(?:should we|should i|whether to|decide whether to)\s+([^.!?]+?)\s+(?:or|vs\.?|versus)\s+([^.!?]+)/gi,
  ]
  const values: string[] = []
  for (const pattern of patterns) for (const match of input.matchAll(pattern)) values.push(match[1].trim(), match[2].trim())
  const labeled = [...input.matchAll(/(?:option|choice|alternative)\s+[a-z0-9]+\s*[:=-]\s*([^.!?]+)/gi)].map(m => m[1].trim())
  values.push(...labeled)
  if (values.length >= 2) return [...new Set(values)].slice(0, 4).map(v => v.charAt(0).toUpperCase() + v.slice(1))
  return ['Proceed now', 'Wait and improve', 'Run a smaller pilot']
}

function extractVariables(input: string): Variable[] {
  const lower = input.toLowerCase()
  const terms = cleanTerms(input).filter(t => t.length > 4)
  const hinted = [...NEGATIVE, ...POSITIVE].filter(word => lower.includes(word))
  const names = [...new Set([...hinted, ...terms])].slice(0, 7)
  const base = names.length ? names : ['budget', 'time', 'demand', 'readiness', 'capacity']
  return base.map((name, i) => ({
    name,
    impact: Math.max(42, 94 - i * 8),
    value: 50,
    low: 0,
    high: 100,
    direction: NEGATIVE.has(name) ? 'negative' : POSITIVE.has(name) ? 'positive' : 'neutral'
  }))
}

export function analyzeDecision(input: string): Analysis {
  const options = extractOptions(input)
  const variables = extractVariables(input)
  const lower = input.toLowerCase()
  const risks = [
    lower.includes('budget') || lower.includes('cost') ? 'Resource pressure could reduce the room available for recovery.' : 'Key assumptions may change after the decision is made.',
    lower.includes('deadline') || lower.includes('time') ? 'Time pressure can force trade-offs between speed and quality.' : 'The preferred path may change when high-impact variables move.',
    'Some factors may interact, so individual scores should be treated as directional rather than guaranteed forecasts.'
  ]
  const assumptions = [
    'The information provided is a reasonable representation of the current situation.',
    'The stated goal is more important than unmentioned objectives.',
    'Changing an input represents a meaningful change in the real-world situation.'
  ]
  const dependencies = variables.slice(0, 5).map(v => `${v.name} influences the relative outcome`)
  const goalMatch = input.match(/(?:goal is|aim is|want to|trying to|objective is)\s+([^.!?]+)/i)
  return {
    title: titleFrom(input),
    summary: `BRANCH mapped ${options.length} paths, ${variables.length} decision variables, and ${risks.length} risks. The model is designed for exploration, not certainty.`,
    goal: goalMatch?.[1]?.trim() || 'Choose the path that best balances the stated goal, constraints, and uncertainty.',
    options,
    variables,
    risks,
    assumptions,
    dependencies,
    confidence: Math.round(Math.min(94, 58 + Math.min(input.length / 12, 30)))
  }
}

export function scoreOption(index: number, variables: Variable[], scenarioBias = 0) {
  const base = [78, 70, 64, 58][index % 4]
  const weighted = variables.reduce((sum, v) => {
    const normalized = v.direction === 'negative' ? 100 - v.value : v.direction === 'neutral' ? 50 + (v.value - 50) * 0.25 : v.value
    return sum + normalized * (v.impact / 100)
  }, 0) / Math.max(variables.length, 1)
  const pathAdjustment = index === 0 ? 4 : index === 1 ? 1 : -2
  return Math.max(1, Math.min(99, Math.round(base + (weighted - 50) * 0.22 + pathAdjustment + scenarioBias)))
}

export function explainChange(before: number, after: number, variable: Variable) {
  const delta = after - before
  if (Math.abs(delta) < 1) return `${variable.name} changed, but the current model does not materially change the relative result.`
  return `${variable.name} moved from ${before} to ${after}. Because it has a ${variable.impact}% impact weight, the scenario score ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)} point${Math.abs(delta) === 1 ? '' : 's'}.`
}
