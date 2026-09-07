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
  { keys: ['budget', 'cost', 'price', 'money', 'funding', 'afford', 'tuition', 'salary'], name: 'Budget flexibility', description: 'How much financial room the choice has before cost becomes a constraint.', direction: 'positive', lowLabel: 'Tight', highLabel: 'Flexible' },
  { keys: ['deadline', 'time', 'month', 'week', 'soon', 'schedule', 'urgent', 'duration'], name: 'Time flexibility', description: 'How much room exists before timing forces the decision.', direction: 'positive', lowLabel: 'Pressured', highLabel: 'Flexible' },
  { keys: ['demand', 'interest', 'audience', 'users', 'customers', 'adoption', 'traction', 'feedback'], name: 'Evidence strength', description: 'How much real evidence supports the outcome you want.', direction: 'positive', lowLabel: 'Limited', highLabel: 'Strong' },
  { keys: ['quality', 'polish', 'improve', 'ready', 'readiness', 'complete', 'finish', 'prepared'], name: 'Readiness', description: 'How prepared the option is for the outcome you want.', direction: 'positive', lowLabel: 'Early', highLabel: 'Ready' },
  { keys: ['access', 'availability', 'event', 'ticket', 'invite', 'opportunity', 'visa', 'eligible'], name: 'Access feasibility', description: 'How feasible it is to obtain the access, permission, or opportunity the path depends on.', direction: 'positive', lowLabel: 'Uncertain', highLabel: 'Likely' },
  { keys: ['travel', 'distance', 'location', 'transport', 'commute', 'move', 'abroad', 'country'], name: 'Logistics', description: 'How practical the travel, location, coordination, or relocation requirements are.', direction: 'positive', lowLabel: 'Difficult', highLabel: 'Practical' },
  { keys: ['team', 'people', 'staff', 'capacity', 'resources', 'developer', 'support', 'family'], name: 'Available capacity', description: 'How much useful time, support, and capability is available to execute the choice.', direction: 'positive', lowLabel: 'Limited', highLabel: 'Available' },
  { keys: ['risk', 'uncertainty', 'unknown', 'information', 'know', 'unsure', 'unclear'], name: 'Information certainty', description: 'How much important information is known before committing.', direction: 'positive', lowLabel: 'Unknowns', highLabel: 'Known' },
  { keys: ['competition', 'competitor', 'market'], name: 'Competitive pressure', description: 'How strongly outside alternatives could change the trade-off.', direction: 'negative', lowLabel: 'Low pressure', highLabel: 'High pressure' },
  { keys: ['experience', 'skill', 'skills', 'confidence', 'capable', 'qualification'], name: 'Capability fit', description: 'How well current capabilities match what the choice requires.', direction: 'positive', lowLabel: 'Stretch', highLabel: 'Strong fit' },
]

function titleFrom(input: string) {
  const sentence = input.split(/[.!?]/)[0].trim()
  return sentence.length > 78 ? `${sentence.slice(0, 75)}…` : sentence || 'Your decision'
}

function cleanOption(value: string) {
  return value
    .replace(/^(whether|if)\s+/i, '')
    .replace(/^to\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,:;]+$/, '')
}

function usableOption(value: string) {
  const option = cleanOption(value)
  if (option.length < 2 || option.length > 100) return false
  if (/^(i|we|you|should|do|can|could|would|want|need|go|choose|decide)$/i.test(option)) return false
  return true
}

function extractOptions(input: string) {
  const values: string[] = []
  const patterns = [
    /(?:choose|choosing|decide|deciding|decision|choice)\s+(?:between\s+)?(.+?)\s+(?:or|vs\.?|versus)\s+([^.!?]+)/i,
    /(?:should\s+(?:we|i)|do\s+(?:we|i)|would\s+(?:we|i)|could\s+(?:we|i)|whether\s+(?:to|we|i))\s+(.+?)\s+(?:or|vs\.?|versus)\s+([^.!?]+)/i,
    /(?:between)\s+(.+?)\s+(?:and|or|vs\.?|versus)\s+([^.!?]+)/i,
    /\b(?:option|choice|alternative)\s*(?:a|1)\s*[:=-]\s*([^.!?]+?)\s+(?:and|or)\s+(?:option|choice|alternative)\s*(?:b|2)\s*[:=-]\s*([^.!?]+)/i,
  ]
  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match?.[1]) values.push(match[1])
    if (match?.[2]) values.push(match[2])
    if (values.length >= 2) break
  }

  // Natural questions such as “Should I go to USA or Australia?”
  // are common and should never fall into the old “vague wish” branch.
  if (values.length < 2) {
    const natural = input.match(/\b(?:should\s+(?:i|we)|do\s+(?:i|we)|would\s+(?:i|we)|can\s+(?:i|we))\s+(.+?)\s+or\s+([^.!?]+?)(?:\?|$)/i)
    if (natural) values.push(natural[1], natural[2])
  }

  return [...new Set(values.map(cleanOption).filter(usableOption))]
    .slice(0, 4)
    .map(value => value.charAt(0).toUpperCase() + value.slice(1))
}

function extractGoal(input: string) {
  const match = input.match(/(?:goal\s+(?:is|=)|aim\s+(?:is|=)|objective\s+(?:is|=)|success\s+means|trying\s+to|my\s+goal(?:\s+is)?|our\s+goal(?:\s+is)?|optimi[sz](?:e|ing)\s+for)\s*[:=]?\s*([^.!?]+)/i)
  return match?.[1]?.trim() || ''
}

function inferValue(signal: Signal, input: string) {
  const lower = input.toLowerCase()
  const high = ['flexible', 'plenty', 'strong', 'ready', 'available', 'easy', 'likely', 'known', 'high confidence', 'enough', 'ample', 'good fit', 'confirmed'].some(k => lower.includes(k))
  const low = ['limited', 'tight', 'small budget', 'soon', 'urgent', 'uncertain', 'unknown', 'difficult', 'hard', 'low confidence', 'not ready', 'little', 'cannot', 'can’t', 'can not', 'not sure'].some(k => lower.includes(k))
  if (high && !low) return 78
  if (low && !high) return 28
  if (signal.name === 'Time flexibility' && /deadline|this week|today|tomorrow|soon|urgent/i.test(input)) return 30
  if (signal.name === 'Budget flexibility' && /limited budget|small budget|low budget|tight budget/i.test(input)) return 28
  if (signal.name === 'Information certainty' && /do not know|don't know|unknown|unclear|unsure|not sure/i.test(input)) return 25
  if (signal.name === 'Readiness' && /improving|needs work|polish|not ready|unfinished|still building/i.test(input)) return 35
  return 55
}

function extractVariables(input: string): Variable[] {
  const lower = input.toLowerCase()
  const matched = SIGNALS.filter(signal => signal.keys.some(key => lower.includes(key)))
  const selected = (matched.length ? matched : SIGNALS.filter(signal => ['Time flexibility', 'Budget flexibility', 'Information certainty', 'Logistics'].includes(signal.name))).slice(0, 6)
  return selected.map((signal, i) => ({ ...signal, impact: Math.max(40, 88 - i * 8), value: inferValue(signal, input), source: 'derived from your context' }))
}

function missingContext(input: string, options: string[], goal: string) {
  const missing: string[] = []
  if (options.length < 2) {
    missing.push('Name the actual paths you can choose. Example: “Should I choose A or B?”')
  }
  if (!goal) {
    missing.push('Tell BRANCH what you want the decision to optimize for — for example study quality, career growth, cost, speed, safety, flexibility, or another priority.')
  }
  if (!/(budget|cost|price|money|time|deadline|week|month|year|resource|team|capacity|constraint|limit|available|access|visa|location|risk|uncertain|unknown|because|can|cannot|only|have|prefer|priority|important|family|school|study|work)/i.test(input)) {
    missing.push('Add the situation that makes the choice difficult: your budget, timing, access/eligibility, responsibilities, preferences, or biggest uncertainty.')
  }
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
    { id: 'favorable', name: 'Favorable conditions', description: 'The conditions supporting the decision become easier to satisfy.', delta: 18 },
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
      ? [`The path has more room to work with ${first?.name.toLowerCase() || 'its main driver'}.`, `A choice that benefits from this condition becomes easier to justify.`]
      : definition.id === 'tight'
        ? [`The decision becomes more exposed to ${first?.name.toLowerCase() || 'its main constraint'}.`, 'A lower-commitment path may become more attractive because it preserves room to adapt.']
        : [`The current balance around ${first?.name.toLowerCase() || 'the main driver'} and ${second?.name.toLowerCase() || 'the next driver'} is the reference point.`, 'This is the baseline to compare before changing one condition at a time.']
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
  const reason = `Given your goal of ${goal || 'the priorities you supplied'}, ${option} currently fits the model best. This is conditional rather than a prediction: if ${firstDriver} changes materially, BRANCH may favor another path.`
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
    /budget|cost|money|price/i.test(lower) ? 'Cost pressure can reduce the room available to recover from a weak outcome.' : 'Important assumptions can change after the decision is made.',
    /deadline|time|week|month|year/i.test(lower) ? 'Timing can force a trade-off between acting now and learning more first.' : 'The outcome depends on information that may still be incomplete.',
    /access|visa|eligib|opportunity|event/i.test(lower) ? 'Availability, eligibility, or access may be outside your control.' : 'Factors can interact in ways the model cannot fully observe.'
  ]
  const assumptions = [
    'The context you supplied is a reasonable representation of the current situation.',
    goal ? 'Your stated goal is the priority used to frame the recommendation.' : 'A clear priority has not been supplied yet, so BRANCH will not pretend one exists.',
    'The drivers are proxies for conditions, not measurements of the future.'
  ]
  const dependencies = variables.slice(0, 5).map(v => `${v.name} can materially change the trade-off between your paths.`)
  const contextConfidence = Math.round(Math.min(96, 42 + Math.min(input.length / 9, 38) + (options.length >= 2 ? 8 : 0) + (goal ? 8 : 0)))
  const recommendation = ready ? recommendPath(options, goal, variables) : { option: '', reason: '' }
  const recognized = options.length >= 2 ? ` I recognized the paths ${options.join(' and ')}.` : ''
  const summary = ready
    ? `BRANCH found ${options.length} concrete choices and ${variables.length} context-driven decision drivers. The simulation explores consequences under different conditions rather than pretending to know the future.`
    : `BRANCH understands the kind of decision you are making.${recognized} It will not make up a goal, budget, timeline, or preference that you did not provide. Add the missing details below and it can turn this question into a useful model.`
  return {
    title: titleFrom(input),
    summary,
    goal: goal || 'Not specified yet — tell BRANCH what matters most so it can evaluate the paths against your actual priority.',
    options,
    variables,
    risks,
    assumptions,
    dependencies,
    scenarios: ready ? makeScenarios(variables) : [],
    recommendation: recommendation.option,
    recommendationReason: recommendation.reason,
    nextStep: ready ? `Watch ${variables[0]?.name.toLowerCase() || 'the main driver'} first. If that condition changes, revisit the paths before committing.` : 'Reply with the missing context in one sentence. For example: “I’m choosing between A and B. My goal is __. My budget is __. I need to decide by __. I prefer __. The biggest unknown is __.”',
    contextConfidence,
    contextQuality: ready ? 'ready' : 'needs-context',
    missingContext: missing,
  }
}
