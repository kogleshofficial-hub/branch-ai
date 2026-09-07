export type Variable = {
  name: string
  description: string
  impact: number
  value: number
  direction: 'positive' | 'negative' | 'neutral'
  lowLabel: string
  highLabel: string
  source: string
}

export type ScenarioChange = { variable: string; value: number; label: string }

export type Scenario = {
  id: string
  name: string
  description: string
  changes: ScenarioChange[]
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
  recommendation: string
  recommendationReason: string
  nextStep: string
  contextConfidence: number
  contextQuality: 'needs-context' | 'ready'
  missingContext: string[]
}

type Signal = Omit<Variable, 'impact' | 'value' | 'source'> & { keys: string[] }

const SIGNALS: Signal[] = [
  { keys: ['budget','cost','price','money','funding','afford'], name: 'Budget flexibility', description: 'How much financial room the choice has before cost becomes a constraint.', direction: 'positive', lowLabel: 'Tight', highLabel: 'Flexible' },
  { keys: ['deadline','time','month','week','soon','schedule','urgent'], name: 'Time flexibility', description: 'How much room exists before timing forces the decision.', direction: 'positive', lowLabel: 'Pressured', highLabel: 'Flexible' },
  { keys: ['demand','interest','audience','users','customers','adoption','traction'], name: 'Demand evidence', description: 'How much evidence supports the outcome you want.', direction: 'positive', lowLabel: 'Unclear', highLabel: 'Strong' },
  { keys: ['quality','polish','improve','ready','readiness','complete','finish'], name: 'Readiness', description: 'How prepared the option is for the outcome you want.', direction: 'positive', lowLabel: 'Early', highLabel: 'Ready' },
  { keys: ['access','availability','event','ticket','invite','meet','opportunity'], name: 'Access feasibility', description: 'How much control you have over the opportunity the decision depends on.', direction: 'positive', lowLabel: 'Uncertain', highLabel: 'Likely' },
  { keys: ['travel','distance','location','transport','commute'], name: 'Logistics', description: 'How practical the travel, location, coordination, or setup is.', direction: 'positive', lowLabel: 'Difficult', highLabel: 'Practical' },
  { keys: ['team','people','staff','capacity','resources','developer'], name: 'Available capacity', description: 'How much useful time and capability is available to execute the choice.', direction: 'positive', lowLabel: 'Limited', highLabel: 'Available' },
  { keys: ['risk','uncertainty','unknown','information','know'], name: 'Information certainty', description: 'How much important information is known before committing.', direction: 'positive', lowLabel: 'Unknowns', highLabel: 'Known' },
  { keys: ['competition','competitor','market'], name: 'Competitive pressure', description: 'How strongly outside alternatives could change the trade-off.', direction: 'negative', lowLabel: 'Low pressure', highLabel: 'High pressure' },
  { keys: ['experience','skill','skills','confidence','capable'], name: 'Capability fit', description: 'How well current capabilities match what the choice requires.', direction: 'positive', lowLabel: 'Stretch', highLabel: 'Strong fit' },
]

function titleFrom(input: string) {
  const sentence = input.split(/[.!?]/)[0].trim()
  return sentence.length > 78 ? `${sentence.slice(0, 75)}…` : sentence || 'Your decision'
}

function cleanOption(value: string) {
  return value.replace(/^(whether|if)\s+/i, '').replace(/\s+/g, ' ').trim().replace(/[,:;]+$/, '')
}

function extractOptions(input: string) {
  const patterns = [
    /(?:choose between|between|either)\s+([^.!?]+?)\s+(?:or|vs\.?|versus)\s+([^.!?]+)/gi,
    /(?:should (?:we|i)|do we|do i|whether to|decide whether to)\s+([^.!?]+?)\s+(?:or|vs\.?|versus)\s+([^.!?]+)/gi,
    /(?:option|choice|alternative)\s*(?:a|1)\s*[:=-]\s*([^.!?]+?)(?:\s+(?:and|or)\s+(?:option|choice|alternative)\s*(?:b|2)\s*[:=-]\s*([^.!?]+))?/gi,
  ]
  const values: string[] = []
  for (const pattern of patterns) {
    for (const match of input.matchAll(pattern)) {
      if (match[1]) values.push(cleanOption(match[1]))
      if (match[2]) values.push(cleanOption(match[2]))
    }
  }
  return [...new Set(values.filter(v => v.length > 1))].slice(0, 4).map(v => v.charAt(0).toUpperCase() + v.slice(1))
}

function extractGoal(input: string) {
  const match = input.match(/(?:goal is|aim is|trying to|objective is|success means|optimi[sz]e|my goal(?: is)?|our goal(?: is)?)\s*[:=]?\s*([^.!?]+)/i)
  return match?.[1]?.trim() || ''
}

function inferValue(signal: Signal, input: string) {
  const lower = input.toLowerCase()
  const high = ['flexible','plenty','strong','ready','available','easy','likely','known','high confidence','enough','ample','good fit'].some(k => lower.includes(k))
  const low = ['limited','tight','small budget','soon','urgent','uncertain','unknown','difficult','hard','low confidence','not ready','little','cannot','can’t','can not'].some(k => lower.includes(k))
  if (high && !low) return 78
  if (low && !high) return 28
  if (signal.name === 'Time flexibility' && /deadline|this week|today|tomorrow|soon|urgent/i.test(input)) return 30
  if (signal.name === 'Budget flexibility' && /limited budget|small budget|low budget|tight budget/i.test(input)) return 28
  if (signal.name === 'Information certainty' && /do not know|don't know|unknown|unclear|unsure/i.test(input)) return 25
  if (signal.name === 'Readiness' && /improving|needs work|polish|not ready|unfinished/i.test(input)) return 35
  return 55
}

function extractVariables(input: string): Variable[] {
  const lower = input.toLowerCase()
  const matched = SIGNALS.filter(signal => signal.keys.some(key => lower.includes(key)))
  const selected = (matched.length ? matched : SIGNALS.filter(signal => ['Time flexibility','Information certainty','Available capacity'].includes(signal.name))).slice(0, 6)
  return selected.map((signal, i) => ({ ...signal, impact: Math.max(40, 88 - i * 8), value: inferValue(signal, input), source: 'derived from your context' }))
}

function missingContext(input: string, options: string[], goal: string) {
  const missing: string[] = []
  if (options.length < 2) missing.push('Name the actual choices you are deciding between — for example, “do A or do B.”')
  if (!goal) missing.push('Tell BRANCH what you are optimizing for or what a successful outcome looks like.')
  if (!/(budget|cost|time|deadline|week|month|resource|team|capacity|constraint|limit|available|access|location|risk|uncertain|unknown|because|can|cannot|only|have|prefer|priority)/i.test(input)) missing.push('Add at least one real constraint, preference, resource, timing detail, or uncertainty.')
  return missing
}

function scenarioLabel(variable: Variable, value: number) {
  if (value <= 30) return variable.lowLabel
  if (value >= 70) return variable.highLabel
  return 'Moderate'
}

function makeScenarios(variables: Variable[]): Scenario[] {
  const important = variables.slice(0, 4)
  const definitions = [
    { id: 'favorable', name: 'Favorable conditions', description: 'The conditions that support your decision become easier to satisfy.', delta: 18 },
    { id: 'current', name: 'Current conditions', description: 'The situation stays close to the assumptions you supplied.', delta: 0 },
    { id: 'tight', name: 'Constraints tighten', description: 'The most relevant constraints become harder to satisfy.', delta: -18 },
  ]
  return definitions.map(definition => {
    const changes = important.map(variable => {
      const direction = variable.direction === 'negative' ? -1 : 1
      const value = Math.max(0, Math.min(100, variable.value + definition.delta * direction))
      return { variable: variable.name, value, label: scenarioLabel(variable, value) }
    })
    const first = important[0]
    const second = important[1]
    const effects = definition.id === 'favorable'
      ? [`The choice has more room to work with ${first?.name.toLowerCase() || 'its main driver'}.`, `A path that benefits from flexibility becomes easier to justify.`]
      : definition.id === 'tight'
        ? [`The decision becomes more exposed to ${first?.name.toLowerCase() || 'its main constraint'}.`, `A lower-commitment path may become more attractive because it preserves room to adapt.`]
        : [`The current balance around ${first?.name.toLowerCase() || 'the main driver'} and ${second?.name.toLowerCase() || 'the next driver'} remains the reference point.`, 'This is the baseline to compare against before changing one condition at a time.']
    const tradeoffs = definition.id === 'favorable'
      ? ['Moving faster can still reduce the information you collect first.', 'A favorable condition is an assumption to monitor, not a guarantee.']
      : definition.id === 'tight'
        ? ['Reducing commitment can preserve optionality.', 'Waiting can introduce its own cost if the opportunity changes.']
        : ['Your priorities determine which trade-off matters most.', 'The model is directional and should be challenged with real information.']
    return { id: definition.id, name: definition.name, description: definition.description, changes, effects, tradeoffs }
  })
}

function preferenceBonus(option: string, goal: string, variables: Variable[], index: number) {
  const text = `${option} ${goal}`.toLowerCase()
  let fit = Math.max(0, 2 - index)
  if (/(learn|quality|safe|sustainable|long-term|long term|reliable|certainty|understand)/.test(text) && /(wait|delay|improve|research|learn|prepare)/i.test(option)) fit += 4
  if (/(speed|fast|quick|deadline|momentum|growth|opportunity)/.test(text) && /(launch|start|act|accept|commit|ship|now)/i.test(option)) fit += 4
  if (/(flexible|optionality|low risk|test|experiment)/.test(text) && /(pilot|test|small|wait|research)/i.test(option)) fit += 3
  for (const variable of variables) {
    const low = variable.value < 35
    const high = variable.value > 70
    if (variable.name === 'Time flexibility' && low && /(wait|delay|improve|research)/i.test(option)) fit -= 2
    if (variable.name === 'Time flexibility' && low && /(now|launch|start|act|ship)/i.test(option)) fit += 2
    if (variable.name === 'Readiness' && low && /(improve|prepare|wait|research)/i.test(option)) fit += 3
    if (variable.name === 'Readiness' && low && /(launch|ship|commit|now)/i.test(option)) fit -= 2
    if (variable.name === 'Budget flexibility' && low && /(small|pilot|wait|research|improve)/i.test(option)) fit += 2
    if (variable.name === 'Information certainty' && low && /(wait|research|learn|test|pilot)/i.test(option)) fit += 3
    if (variable.name === 'Access feasibility' && high && /(act|go|accept|attend|start|now)/i.test(option)) fit += 2
  }
  return fit
}

export function recommendPath(options: string[], goal: string, variables: Variable[]) {
  if (!options.length) return { option: '', reason: '' }
  const fits = options.map((option, index) => preferenceBonus(option, goal, variables, index))
  const index = fits.indexOf(Math.max(...fits))
  const option = options[index]
  const firstDriver = variables[0]?.name.toLowerCase() || 'your main decision driver'
  const reason = `Given your goal of ${goal || 'making a choice that fits your situation'}, ${option} currently aligns best with the priorities and conditions you supplied. The recommendation is conditional: if ${firstDriver} changes materially, BRANCH may favor a different path.`
  return { option, reason }
}

export function simulateScenarios(variables: Variable[]) {
  return makeScenarios(variables)
}

export function analyzeDecision(input: string): Analysis {
  const options = extractOptions(input)
  const goal = extractGoal(input)
  const variables = extractVariables(input)
  const missing = missingContext(input, options, goal)
  const ready = missing.length === 0
  const lower = input.toLowerCase()
  const risks = [
    /budget|cost|money/i.test(lower) ? 'Cost pressure can reduce the room available to recover from a weak outcome.' : 'Important assumptions can change after the decision is made.',
    /deadline|time|week|month/i.test(lower) ? 'Timing can force a trade-off between acting now and learning more first.' : 'The outcome depends on information that may still be incomplete.',
    /access|meet|event|opportunity/i.test(lower) ? 'Availability or access may be outside your control.' : 'Factors can interact in ways the model cannot fully observe.'
  ]
  const assumptions = [
    'The context you supplied is a reasonable representation of the current situation.',
    goal ? 'Your stated goal is the priority used to frame the recommendation.' : 'No explicit goal has been supplied yet.',
    'The drivers are proxies for conditions, not measurements of the future.'
  ]
  const dependencies = variables.slice(0, 5).map(v => `${v.name} can materially change the trade-off between your paths.`)
  const contextConfidence = Math.round(Math.min(96, 42 + Math.min(input.length / 9, 38) + (options.length >= 2 ? 8 : 0) + (goal ? 8 : 0)))
  const recommendation = ready ? recommendPath(options, goal, variables) : { option: '', reason: '' }
  return {
    title: titleFrom(input),
    summary: ready ? `BRANCH found ${options.length} concrete choices and ${variables.length} context-driven decision drivers. The simulation explores consequences under different conditions rather than pretending to know the future.` : 'BRANCH can help with this, but it needs a few specific facts before it can responsibly construct the paths.',
    goal: goal || 'Not specified — BRANCH needs to know what you are optimizing for before it can recommend a path.',
    options: ready ? options : [],
    variables,
    risks,
    assumptions,
    dependencies,
    scenarios: ready ? makeScenarios(variables) : [],
    recommendation: recommendation.option,
    recommendationReason: recommendation.reason,
    nextStep: ready ? `Watch ${variables[0]?.name.toLowerCase() || 'the main driver'} first. If that condition changes, revisit the paths before committing.` : missing[0] || 'Add more context to continue.',
    contextConfidence,
    contextQuality: ready ? 'ready' : 'needs-context',
    missingContext: missing,
  }
}
