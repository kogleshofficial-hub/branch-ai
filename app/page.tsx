'use client'

import { useState } from 'react'
import type { Analysis } from '@/lib/engine'

const demo = `Should I launch my SaaS this month or spend two more weeks improving it? My goal is to maximize sustainable adoption without sacrificing product quality. I have a two-person team, a limited budget, and a school-year deadline. I prefer learning from real users, but I am uncertain whether the product is ready.`

const examples = [
  ['Startup', 'Should we launch now or keep improving for two weeks? Our goal is sustainable adoption. We have a two-person team, a limited budget, and a deadline this month. We prefer learning from real users but the product still needs polish.'],
  ['Career', 'Should I accept this opportunity now or wait for a better fit? My goal is long-term learning and a healthy schedule. I have another interview in two weeks, limited time to decide, and I prefer work that leaves room for study.'],
  ['Product', 'Should our team build feature A or feature B first? Our goal is to improve user retention. We have three developers, a six-week deadline, limited capacity, and early user feedback is stronger for feature A.'],
]

export default function Home() {
  const [decision, setDecision] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [values, setValues] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'paths' | 'scenarios' | 'why'>('paths')
  const [selectedScenario, setSelectedScenario] = useState('current')

  const currentVariables = analysis?.variables.map(variable => ({ ...variable, value: values[variable.name] ?? variable.value })) ?? []
  const selected = analysis?.scenarios.find(scenario => scenario.id === selectedScenario) ?? analysis?.scenarios.find(scenario => scenario.id === 'current')

  async function run() {
    setError('')
    if (decision.trim().length < 20) {
      setError('Give BRANCH a little more context. Describe the choice, your goal, and at least one constraint or uncertainty.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) })
      const data = await response.json()
      if (!response.ok || !data.analysis) throw new Error(data.error || 'Unable to build the decision model.')
      setAnalysis(data.analysis)
      setValues(Object.fromEntries(data.analysis.variables.map((variable: Analysis['variables'][number]) => [variable.name, variable.value])))
      setActiveTab('paths')
      setSelectedScenario('current')
      window.setTimeout(() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function loadDemo() {
    setDecision(demo)
    setAnalysis(null)
    setError('')
    window.setTimeout(() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }), 20)
  }

  function reset() {
    if (analysis) setValues(Object.fromEntries(analysis.variables.map(variable => [variable.name, variable.value])))
  }

  return (
    <main className="shell">
      <nav className="nav">
        <a className="brand" href="#top" aria-label="BRANCH home"><span className="mark">B</span><span>BRANCH</span></a>
        <div className="navRight"><span className="navlink">Decision intelligence</span><a href="#how">How it works</a><a href="#workspace">Workspace</a></div>
      </nav>

      <section className="hero container" id="top">
        <div className="heroCopy">
          <div className="eyebrow">AI-powered decision simulation</div>
          <h1>Explore the decision<br /><span>before you make it.</span></h1>
          <p>BRANCH turns a complicated choice into a living model of paths, conditions, consequences, and trade-offs. It can recommend a path when your context supports one — while showing exactly what could make that recommendation change.</p>
          <div className="actions"><button className="btn primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>Explore a decision <span>→</span></button><button className="btn ghost" onClick={loadDemo}>See a live example</button></div>
          <div className="trustRow"><span>● Context-aware</span><span>● No credit system</span><span>● Explainable simulation</span></div>
        </div>
        <div className="heroCard" aria-label="BRANCH simulation preview">
          <div className="cardTop"><div><div className="miniLabel">Simulation preview</div><strong>One choice. Multiple ways it can unfold.</strong></div><span className="liveDot">● READY</span></div>
          <div className="branchPreview">
            <div className="previewDecision"><span>YOUR DECISION</span><b>Launch now or improve?</b></div>
            <div className="previewLine" />
            <div className="previewBranches"><div><span>PATH A</span><b>Launch now</b><small>Learn sooner · accept current uncertainty</small></div><div><span>PATH B</span><b>Improve first</b><small>Increase readiness · delay learning</small></div></div>
            <div className="previewLine short" />
            <div className="previewOutcome"><span>CHANGE A CONDITION</span><b>What if the deadline tightens?</b></div>
          </div>
          <div className="previewBottom"><span>Paths <b>2</b></span><span>Drivers <b>5</b></span><span>Scenarios <b>3</b></span></div>
        </div>
      </section>

      <section className="problemBand"><div className="container split"><div><div className="eyebrow">The principle</div><h2>A decision tool should explain its reasoning, not hide it behind a number.</h2></div><p>BRANCH separates language understanding from deterministic simulation. Your goal, preferences, constraints, timing, and uncertainty shape the model. If your input is too vague, BRANCH tells you precisely what to add instead of fabricating a confident-looking answer.</p></div></section>

      <section className="section container" id="how">
        <div className="sectionHeading"><div><div className="eyebrow">How BRANCH works</div><h2>From messy thought to an explorable decision model.</h2></div><p>The system identifies actual choices first, then finds the conditions that can change the trade-off. The recommendation is a conclusion from the stated context — not a universal answer.</p></div>
        <div className="steps">
          {[['01','Understand','Read the decision, goal, preferences, constraints, timing, and uncertainty.'],['02','Structure','Separate real choices from the context that influences those choices.'],['03','Simulate','Generate context-specific conditions and trace what could change along each path.'],['04','Explain','Recommend when justified, show why, and reveal what would change the recommendation.']].map(([n, title, text]) => <article className="step" key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="workspaceSection" id="workspace">
        <div className="container">
          <div className="sectionHeading"><div><div className="eyebrow">Decision workspace</div><h2>Give BRANCH the situation. Then explore what follows.</h2></div><p>You do not need to know the perfect format. Write naturally. BRANCH will tell you what it understood and, when something is missing, ask for the specific detail that would make the model trustworthy.</p></div>
          <div className="workspace">
            <aside className="inputPanel panel">
              <div className="panelLabel"><span>01</span> Your situation</div>
              <textarea className="field textarea" value={decision} onChange={event => setDecision(event.target.value)} placeholder="Tell BRANCH what you're deciding, what you want, what you can work with, and what you're unsure about…" />
              <div className="contextChecklist"><span>BRANCH looks for</span><b>Choices you can actually make</b><b>Your goal + preferences</b><b>Time, budget, people, or other limits</b><b>Unknowns that could change the outcome</b></div>
              <button className="btn primary full" onClick={run} disabled={busy}>{busy ? <><span className="spinner" /> Understanding your decision…</> : <>Build my decision model <span>→</span></>}</button>
              {error && <div className="errorBox" role="alert">{error}</div>}
              <div className="examples"><div className="miniLabel">Start with a complete situation</div>{examples.map(([label, text]) => <button key={label} onClick={() => setDecision(text)}><span>{label}</span>{text}</button>)}</div>
            </aside>

            <section className="modelPanel panel">
              {!analysis ? <div className="emptyState"><div className="emptyIcon">⌁</div><div className="eyebrow">No model yet</div><h3>Start with the decision behind the question.</h3><p>For example, “I want to move abroad” is an outcome. BRANCH needs the choices you are considering — where to go, when to move, whether to study or work — plus the priorities and constraints that matter to you.</p><button className="btn ghost" onClick={loadDemo}>Load the live example</button></div> : <>
                <div className="modelHeader"><div><div className="miniLabel">BRANCH understood</div><h3>{analysis.title}</h3><p>{analysis.summary}</p></div><div className="contextBadge"><b>{analysis.contextConfidence}%</b><span>context fit</span></div></div>

                {analysis.contextQuality === 'needs-context' && <div className="contextWarning"><div className="warningIcon">!</div><div><strong>BRANCH needs a little more context before it branches.</strong><span>It can still understand the intent of your message. It just will not invent choices or consequences that you did not provide.</span><ul>{analysis.missingContext.map(item => <li key={item}>{item}</li>)}</ul><div className="contextPrompt"><b>Give it this shape:</b> “I’m deciding between A and B. My goal is __. I prefer __. I can __. I cannot __. The biggest unknown is __.”</div></div></div>}

                {analysis.contextQuality === 'ready' && <>
                  <div className="tabs" role="tablist"><button className={activeTab === 'paths' ? 'active' : ''} onClick={() => setActiveTab('paths')}>Paths</button><button className={activeTab === 'scenarios' ? 'active' : ''} onClick={() => setActiveTab('scenarios')}>What could happen</button><button className={activeTab === 'why' ? 'active' : ''} onClick={() => setActiveTab('why')}>Why BRANCH says that</button></div>

                  {activeTab === 'paths' && <div className="modelGrid">
                    <div className="resultCard pathCard"><div className="cardHeading"><span>Your possible paths</span><span className="pill">{analysis.options.length} choices</span></div><p className="cardIntro">These are the choices BRANCH found in your own description. The cards explain what committing to each path could mean.</p><div className="pathList">{analysis.options.map((option, index) => <article className={`pathItem ${option === analysis.recommendation ? 'recommendedPath' : ''}`} key={option}><div className="pathNumber">0{index + 1}</div><div className="pathBody"><div className="pathMeta"><span>PATH {index + 1}</span>{option === analysis.recommendation && <em>RECOMMENDED FOR YOUR PRIORITY</em>}</div><b>{option}</b><p>{index === 0 ? 'A direct route that commits to this choice under your current conditions.' : index === 1 ? 'An alternative route that changes when you commit and what you learn first.' : 'A different commitment level that preserves another kind of flexibility.'}</p></div></article>)}</div></div>

                    <div className="resultCard recommendationCard"><div className="aiBadge">✦ CONTEXTUAL RECOMMENDATION</div><h3>{analysis.recommendation}</h3><p>{analysis.recommendationReason}</p><div className="recommendationRule"><span>WHAT WOULD CHANGE IT</span><b>{analysis.nextStep}</b></div></div>

                    <div className="resultCard fullCard"><div className="cardHeading"><span>Adjust the conditions</span><span className="muted">Only meaningful drivers from your context</span></div><p className="cardIntro">These controls are not scores. They represent conditions BRANCH found in what you told it. Change one to test a different situation.</p>{currentVariables.map(variable => <label className="variable" key={variable.name}><div className="variableTop"><div><b>{variable.name}</b><span>{variable.description}</span></div><output>{variable.value <= 30 ? variable.lowLabel : variable.value >= 70 ? variable.highLabel : 'Moderate'}</output></div><input type="range" min="0" max="100" value={variable.value} onChange={event => setValues(previous => ({ ...previous, [variable.name]: Number(event.target.value) }))} aria-label={`${variable.name} condition`} /><div className="rangeLabels"><span>{variable.lowLabel}</span><span>{variable.highLabel}</span></div></label>)}<div className="variableFooter"><button className="btn ghost small" onClick={reset}>Reset conditions</button><span>Changing a condition tests the model; it does not predict the future.</span></div></div>
                  </div>}

                  {activeTab === 'scenarios' && <div className="scenarioView"><div className="scenarioIntro"><div><div className="miniLabel">Generated from your context</div><h3>Three ways the same decision could unfold.</h3><p>BRANCH creates scenarios from the drivers it found in your situation. They are deliberately written as consequences, not fake forecasts.</p></div></div><div className="scenarioCards">{analysis.scenarios.map(scenario => <button className={`scenarioCard ${selectedScenario === scenario.id ? 'selected' : ''}`} key={scenario.id} onClick={() => setSelectedScenario(scenario.id)}><span>{scenario.id === 'current' ? 'BASELINE' : 'SCENARIO'}</span><b>{scenario.name}</b><p>{scenario.description}</p><small>{scenario.changes.slice(0, 3).map(change => `${change.variable}: ${change.label}`).join(' · ')}</small></button>)}</div>{selected && <div className="scenarioResult resultCard"><div className="cardHeading"><span>{selected.name}</span><span className="pill">WHAT-IF EXPLORATION</span></div><p className="scenarioDescription">{selected.description}</p><div className="scenarioColumns"><div><h4>Conditions in this scenario</h4>{selected.changes.map(change => <div className="changeRow" key={change.variable}><span>{change.variable}</span><b>{change.label}</b></div>)}</div><div><h4>What could happen</h4>{selected.effects.map(effect => <p className="bullet" key={effect}>→ {effect}</p>)}<h4 className="subhead">Trade-offs to watch</h4>{selected.tradeoffs.map(tradeoff => <p className="bullet mutedBullet" key={tradeoff}>↳ {tradeoff}</p>)}</div></div></div>}</div>}

                  {activeTab === 'why' && <div className="explainGrid"><div className="explainMain resultCard"><div className="aiBadge">✦ DECISION EXPLANATION</div><h3>Why this path fits your stated priorities</h3><p>{analysis.recommendationReason}</p>{currentVariables.slice(0, 5).map((variable, index) => <div className="insight" key={variable.name}><span>0{index + 1}</span><div><b>{variable.name}</b><p>{variable.description} Your current setting is <strong>{variable.value <= 30 ? variable.lowLabel : variable.value >= 70 ? variable.highLabel : 'Moderate'}</strong>. If that condition changes, the trade-off can change with it.</p></div></div>)}<div className="insight"><span>!</span><div><b>What BRANCH cannot know</b><p>Unexpected events, private information, and human behavior can change reality. The recommendation is conditional on the context you supplied.</p></div></div></div><div className="explainSide resultCard"><div className="cardHeading"><span>Risks</span><span className="pill danger">WATCH</span></div>{analysis.risks.map((risk, index) => <p className="risk" key={risk}><span>0{index + 1}</span>{risk}</p>)}<div className="cardHeading second"><span>Assumptions</span></div>{analysis.assumptions.map(assumption => <p className="assumption" key={assumption}>✓ {assumption}</p>)}</div></div>}
                </>}
              </>}
            </section>
          </div>
        </div>
      </section>

      <section className="section container useCases"><div className="eyebrow">One engine. Many decisions.</div><h2>Useful anywhere uncertainty matters.</h2><div className="useGrid">{['Launching a product','Career & education choices','Travel & major plans','Small-business planning','Team prioritization','Everyday complex choices'].map((item, index) => <div className="useCard" key={item}><span>0{index + 1}</span><b>{item}</b><p>Explore choices, constraints, conditions, consequences, and trade-offs.</p></div>)}</div></section>

      <section className="finalCta"><div className="container"><div className="eyebrow">Your context. Your priorities. Your exploration.</div><h2>Don't just ask AI what to do.<br /><span>Explore what could happen.</span></h2><p>BRANCH helps you see the decision from more than one angle — and understand what would change your mind.</p><button className="btn primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>Build a decision <span>→</span></button></div></section>

      <footer className="footer"><div>BRANCH</div><span>Explore the decision before you make it.</span><b>Built By Koglesh R. Murugan</b></footer>
    </main>
  )
}
