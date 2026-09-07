export type Variable = {
  name: string
  description: string
  impact: number
  value: number
  direction: 'positive' | 'negative' | 'neutral'
}

export type Scenario = {
  id: string
  name: string
  description: string
  changes: { variable: string; value: number }[]
  scores: number[]
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
  scenarios: Scenario[]
  confidence: number
  contextQuality: 'needs-context' | 'ready'
  missingContext: string[]
}

const SIGNALS = [
  { keys: ['budget','cost','price','money','funding'], name: 'Budget flexibility', description: 'Room to absorb cost or resource changes.', direction: 'negative' as const },
  { keys: ['deadline','time','month','week','soon','schedule'], name: 'Time pressure', description: 'How strongly timing limits the available choices.', direction: 'negative' as const },
  { keys: ['demand','interest','audience','users','customers','adoption'], name: 'Demand likelihood', description: 'How likely the intended audience is to respond positively.', direction: 'positive' as const },
  { keys: ['quality','polish','improve','ready','readiness'], name: 'Readiness', description: 'How prepared the option is to deliver a useful result.', direction: 'positive' as const },
  { keys: ['access','availability','event','ticket','invite','meet'], name: 'Access feasibility', description: 'How realistically the required access or opportunity can be obtained.', direction: 'positive' as const },
  { keys: ['travel','distance','location','transport'], name: 'Logistics feasibility', description: 'How practical the required movement or location is.', direction: 'positive' as const },
  { keys: ['team','people','staff','capacity','resources'], name: 'Available capacity', description: 'How much useful time and capability is available to execute the choice.', direction: 'positive' as const },
  { keys: ['risk','uncertainty','unknown'], name: 'Uncertainty', description: 'How much depends on information you do not yet know.', direction: 'negative' as const },
  { keys: ['competition','competitor'], name: 'Competitive pressure', description: 'How much outside competition can reduce the attractiveness of an option.', direction: 'negative' as const },
  { keys: ['experience','skill','skills','confidence'], name: 'Capability fit', description: 'How well current capabilities match what the option requires.', direction: 'positive' as const },
]

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
  return []
}

function extractGoal(input: string) {
  const match = input.match(/(?:goal is|aim is|want to|trying to|objective is|success means|i want|we want)\s+([^.!?]+)/i)
  return match?.[1]?.trim() || ''
}

function extractVariables(input: string): Variable[] {
  const lower = input.toLowerCase()
  const matched = SIGNALS.filter(signal => signal.keys.some(key => lower.includes(key)))
  const selected = (matched.length ? matched : SIGNALS.filter(signal => ['Access feasibility','Time pressure','Uncertainty'].includes(signal.name))).slice(0, 6)
  return selected.map((signal, i) => ({ name: signal.name, description: signal.description, impact: Math.max(52, 94 - i * 7), value: 50, direction: signal.direction }))
}

function missingContext(input: string, options: string[], goal: string) {
  const lower = input.toLowerCase()
  const missing: string[] = []
  if (options.length < 2) missing.push('at least two realistic options')
  if (!goal) missing.push('what success looks like or what you want to optimize')
  if (!/(budget|cost|time|deadline|week|month|resource|team|constraint|limit|available|access|location|risk|uncertain)/i.test(lower)) missing.push('the main constraint, resource, timing, or uncertainty')
  return missing
}

function score(index: number, variables: Variable[], scenarioBias = 0) {
  const base = [74, 70, 66, 62][index % 4]
  const weighted = variables.reduce((sum, v) => {
    const normalized = v.direction === 'negative' ? 100 - v.value : v.direction === 'neutral' ? 50 + (v.value - 50) * 0.25 : v.value
    return sum + normalized * (v.impact / 100)
  }, 0) / Math.max(variables.length, 1)
  const pathAdjustment = index === 0 ? 4 : index === 1 ? 1 : -2
  return Math.max(1, Math.min(99, Math.round(base + (weighted - 50) * 0.22 + pathAdjustment + scenarioBias)))
}

function makeScenarios(variables: Variable[], options: string[]): Scenario[] {
  const definitions = [
    { id: 'favorable', name: 'Favorable conditions', description: 'Key favorable factors improve while the main constraint stays manageable.', shift: 18 },
    { id: 'expected', name: 'Expected conditions', description: 'Current assumptions hold and no major surprise changes the situation.', shift: 0 },
    { id: 'constrained', name: 'Constraints tighten', description: 'The most important constraint worsens and execution becomes harder.', shift: -18 },
  ]
  return definitions.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    changes: variables.slice(0, 3).map((v, i) => ({ variable: v.name, value: Math.max(0, Math.min(100, 50 + (s.id === 'expected' ? 0 : (v.direction === 'negative' ? -s.shift : s.shift)) - i * (s.id === 'constrained' ? 2 : 0))) })),
    scores: options.map((_, i) => score(i, variables, s.shift / 3)),
  }))
}

export function analyzeDecision(input: string): Analysis {
  const options = extractOptions(input)
  const goal = extractGoal(input)
  const variables = extractVariables(input)
  const lower = input.toLowerCase()
  const missing = missingContext(input, options, goal)
  const ready = missing.length === 0
  const risks = [
    lower.includes('budget') || lower.includes('cost') ? 'Resource pressure could reduce the room available to recover from a weak outcome.' : 'Key assumptions may change after the decision is made.',
    lower.includes('deadline') || lower.includes('time') ? 'Time pressure can force trade-offs between speed and quality.' : 'The outcome depends on information that may be incomplete today.',
    lower.includes('access') || lower.includes('meet') || lower.includes('event') ? 'Access or availability may be outside your control.' : 'Different factors may interact, so scores are directional rather than guaranteed forecasts.'
  ]
  const assumptions = [
    'The information provided is a reasonable representation of the current situation.',
    'The stated goal is more important than unmentioned objectives.',
    'The selected variables are useful proxies for the decision, not facts about the future.'
  ]
  const dependencies = variables.slice(0, 5).map(v => `${v.name} influences the relative attractiveness of each path`)
  const confidence = Math.round(Math.min(94, 48 + Math.min(input.length / 10, 42) + (options.length >= 2 ? 4 : 0) + (goal ? 4 : 0)))
  return {
    title: titleFrom(input),
    summary: ready ? `BRANCH mapped ${options.length} paths, ${variables.length} meaningful variables, and ${risks.length} risks. The model is designed for exploration, not certainty.` : 'This is a starting point, not a trustworthy decision model yet. BRANCH needs a little more context before it invents paths or scores.',
    goal: goal || 'Not specified yet — define what a good outcome means before comparing paths.',
    options: ready ? options : [],
    variables,
    risks,
    assumptions,
    dependencies,
    scenarios: ready ? makeScenarios(variables, options) : [],
    confidence,
    contextQuality: ready ? 'ready' : 'needs-context',
    missingContext: missing,
  }
}

export function scoreOption(index: number, variables: Variable[], scenarioBias = 0) { return score(index, variables, scenarioBias) }

export function explainChange(before: number, after: number, variable: Variable) {
  const delta = after - before
  if (Math.abs(delta) < 1) return `${variable.name} changed, but the current model does not materially change the relative result.`
  return `${variable.name} moved from ${before} to ${after}. Because it has a ${variable.impact}% impact weight, the scenario score ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)} point${Math.abs(delta) === 1 ? '' : 's'}.`
}
