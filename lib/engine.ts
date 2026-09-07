export type Variable = {
  name: string
  description: string
  impact: number
  value: number
  direction: 'positive' | 'negative' | 'neutral'
  lowLabel: string
  highLabel: string
}

export type Scenario = {
  id: string
  name: string
  description: string
  changes: { variable: string; value: number; label: string }[]
  effects: string[]
  tradeoffs: string[]
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
  { keys: ['budget','cost','price','money','funding'], name: 'Budget room', description: 'How much financial flexibility the decision has.', direction: 'positive' as const, lowLabel: 'Tight', highLabel: 'Flexible' },
  { keys: ['deadline','time','month','week','soon','schedule'], name: 'Time flexibility', description: 'How much room you have before timing forces a choice.', direction: 'positive' as const, lowLabel: 'Pressured', highLabel: 'Flexible' },
  { keys: ['demand','interest','audience','users','customers','adoption'], name: 'Demand evidence', description: 'How much evidence suggests the intended outcome is wanted.', direction: 'positive' as const, lowLabel: 'Unclear', highLabel: 'Strong' },
  { keys: ['quality','polish','improve','ready','readiness'], name: 'Readiness', description: 'How prepared the option is for the outcome you want.', direction: 'positive' as const, lowLabel: 'Early', highLabel: 'Ready' },
  { keys: ['access','availability','event','ticket','invite','meet'], name: 'Access feasibility', description: 'How realistic it is to access the opportunity the decision depends on.', direction: 'positive' as const, lowLabel: 'Uncertain', highLabel: 'Likely' },
  { keys: ['travel','distance','location','transport'], name: 'Logistics', description: 'How practical the required travel, location, or coordination is.', direction: 'positive' as const, lowLabel: 'Difficult', highLabel: 'Practical' },
  { keys: ['team','people','staff','capacity','resources'], name: 'Available capacity', description: 'How much useful time and capability is available to execute the choice.', direction: 'positive' as const, lowLabel: 'Limited', highLabel: 'Available' },
  { keys: ['risk','uncertainty','unknown'], name: 'Information certainty', description: 'How much of the decision is supported by information you already have.', direction: 'positive' as const, lowLabel: 'Unknowns', highLabel: 'Known' },
  { keys: ['competition','competitor'], name: 'Competitive pressure', description: 'How much outside competition could change the attractiveness of a path.', direction: 'negative' as const, lowLabel: 'Low pressure', highLabel: 'High pressure' },
  { keys: ['experience','skill','skills','confidence'], name: 'Capability fit', description: 'How well your current capabilities match what the option requires.', direction: 'positive' as const, lowLabel: 'Stretch', highLabel: 'Strong fit' },
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
  for (const pattern of patterns) {
    for (const match of input.matchAll(pattern)) values.push(match[1].trim(), match[2].trim())
  }
  const labeled = [...input.matchAll(/(?:option|choice|alternative)\s+[a-z0-9]+\s*[:=-]\s*([^.!?]+)/gi)].map(m => m[1].trim())
  values.push(...labeled)
  if (values.length >= 2) return [...new Set(values)].slice(0, 4).map(v => v.charAt(0).toUpperCase() + v.slice(1))
  return []
}

function extractGoal(input: string) {
  const match = input.match(/(?:goal is|aim is|trying to|objective is|success means|i want to optimize|we want to optimize|my goal|our goal)\s*[:=]?\s*([^.!?]+)/i)
  return match?.[1]?.trim() || ''
}

function extractVariables(input: string): Variable[] {
  const lower = input.toLowerCase()
  const matched = SIGNALS.filter(signal => signal.keys.some(key => lower.includes(key)))
  const selected = (matched.length ? matched : SIGNALS.filter(signal => ['Access feasibility','Time flexibility','Information certainty'].includes(signal.name))).slice(0, 6)
  return selected.map((signal, i) => ({
    name: signal.name,
    description: signal.description,
    impact: Math.max(52, 92 - i * 7),
    value: 50,
    direction: signal.direction,
    lowLabel: signal.lowLabel,
    highLabel: signal.highLabel,
  }))
}

function missingContext(input: string, options: string[], goal: string) {
  const lower = input.toLowerCase()
  const missing: string[] = []
  if (options.length < 2) missing.push('at least two realistic choices you are deciding between')
  if (!goal) missing.push('what a good outcome means or what you are optimizing for')
  if (!/(budget|cost|time|deadline|week|month|resource|team|constraint|limit|available|access|location|risk|uncertain|because|can|cannot|only|have)/i.test(lower)) missing.push('a constraint, resource, timing detail, or important uncertainty')
  return missing
}

function scenarioLabel(variable: Variable, value: number) {
  if (value <= 30) return variable.lowLabel
  if (value >= 70) return variable.highLabel
  return 'Moderate'
}

function makeScenarios(variables: Variable[]): Scenario[] {
  const definitions = [
    { id: 'upside', name: 'Conditions improve', description: 'The assumptions that matter most move in a favorable direction.', delta: 22 },
    { id: 'expected', name: 'Current situation', description: 'Your present assumptions hold without a major surprise.', delta: 0 },
    { id: 'pressure', name: 'A constraint tightens', description: 'The most important constraint becomes harder to satisfy.', delta: -22 },
  ]
  return definitions.map(definition => {
    const changes = variables.slice(0, 4).map((variable, index) => {
      const signed = variable.direction === 'negative' ? -definition.delta : definition.delta
      const value = Math.max(0, Math.min(100, 50 + signed - index * (definition.id === 'pressure' ? 2 : 0)))
      return { variable: variable.name, value, label: scenarioLabel(variable, value) }
    })
    const first = variables[0]
    const second = variables[1]
    const effects = definition.id === 'upside'
      ? [`More room to act on ${first?.name.toLowerCase() || 'the main driver'}.`, `The decision has more space to absorb uncertainty.`]
      : definition.id === 'pressure'
        ? [`The decision becomes more sensitive to ${first?.name.toLowerCase() || 'its main constraint'}.`, `A path that depends on flexibility carries more downside.`]
        : [`The current balance between ${first?.name.toLowerCase() || 'the main driver'} and ${second?.name.toLowerCase() || 'the next driver'} remains intact.`, 'Small changes are more useful to investigate than a single predicted outcome.']
    const tradeoffs = definition.id === 'upside'
      ? ['Faster action may still trade away information.', 'A favorable assumption can reverse later.']
      : definition.id === 'pressure'
        ? ['Waiting or reducing commitment may preserve optionality.', 'Delay can also create its own opportunity cost.']
        : ['There is no universally best path without knowing which trade-off matters most to you.', 'The model should be challenged with your real constraints.']
    return { id: definition.id, name: definition.name, description: definition.description, changes, effects, tradeoffs }
  })
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
    lower.includes('access') || lower.includes('meet') || lower.includes('event') ? 'Access or availability may be outside your control.' : 'Different factors can interact, so the simulation is directional rather than predictive.'
  ]
  const assumptions = [
    'The information provided is a reasonable representation of the current situation.',
    'The stated goal is more important than unmentioned objectives.',
    'The variables are useful proxies for the decision, not facts about the future.'
  ]
  const dependencies = variables.slice(0, 5).map(v => `${v.name} can change which trade-off matters most.`)
  const confidence = Math.round(Math.min(94, 48 + Math.min(input.length / 10, 42) + (options.length >= 2 ? 4 : 0) + (goal ? 4 : 0)))
  return {
    title: titleFrom(input),
    summary: ready ? `BRANCH mapped ${options.length} choices and ${variables.length} meaningful decision drivers. Explore how the situation changes instead of treating one result as an answer.` : 'This is not a trustworthy decision model yet. BRANCH needs more context before it invents choices or conclusions.',
    goal: goal || 'Not specified yet — define what a good outcome means before comparing the paths.',
    options: ready ? options : [],
    variables,
    risks,
    assumptions,
    dependencies,
    scenarios: ready ? makeScenarios(variables) : [],
    confidence,
    contextQuality: ready ? 'ready' : 'needs-context',
    missingContext: missing,
  }
}
