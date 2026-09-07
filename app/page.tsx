'use client'

import { useState } from 'react'
import { type Analysis } from '@/lib/engine'

const demo = `Should I launch my SaaS this month or spend two more weeks improving it? My goal is to maximize sustainable adoption without sacrificing product quality. I have a two-person team, a limited budget, and a school-year deadline.`

const examples = [
  ['Startup', 'Should we launch now or keep improving for two weeks? Our goal is sustainable adoption. We have a two-person team, limited budget, and a deadline this month.'],
  ['Career', 'Should I accept this opportunity now or wait for a better fit? My goal is long-term learning and a healthy schedule. I have another interview in two weeks and limited time to decide.'],
  ['Product', 'Should our team build feature A or feature B first? Our goal is to improve user retention. We have three developers, a six-week deadline, and limited capacity.'],
]

export default function Home() {
  const [decision, setDecision] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [values, setValues] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'map' | 'scenarios' | 'assumptions'>('map')
  const [selectedScenario, setSelectedScenario] = useState('expected')

  const currentVariables = analysis?.variables.map(v => ({ ...v, value: values[v.name] ?? v.value })) ?? []
  const selected = analysis?.scenarios.find(s => s.id === selectedScenario) ?? analysis?.scenarios.find(s => s.id === 'expected')

  async function run() {
    setError('')
    if (decision.trim().length < 20) { setError('Give BRANCH enough context to model the decision.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to build the model.')
      setAnalysis(data.analysis)
      setValues(Object.fromEntries(data.analysis.variables.map((v: Analysis['variables'][number]) => [v.name, v.value])))
      setSelectedScenario('expected')
      setActiveTab('map')
      window.setTimeout(() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
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

  function updateValue(name: string, value: number) {
    setValues(previous => ({ ...previous, [name]: value }))
  }

  function resetAssumptions() {
    if (analysis) setValues(Object.fromEntries(analysis.variables.map(v => [v.name, v.value])))
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
          <p>BRANCH turns a complicated choice into a transparent set of possible paths. Change the conditions, inspect the trade-offs, and see what becomes more or less attractive — without pretending to predict the future.</p>
          <div className="actions"><button className="btn primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>Explore a decision <span>→</span></button><button className="btn ghost" onClick={loadDemo}>See a live example</button></div>
          <div className="trustRow"><span>● Free to explore</span><span>● No credit system</span><span>● Explainable model</span></div>
        </div>
        <div className="heroCard" aria-label="BRANCH simulation preview">
          <div className="cardTop"><div><div className="miniLabel">Simulation preview</div><strong>One decision. Multiple ways it can unfold.</strong></div><span className="liveDot">● READY</span></div>
          <div className="branchPreview">
            <div className="previewDecision"><span>DECISION</span><b>Launch now or improve?</b></div>
            <div className="previewLine" />
            <div className="previewBranches"><div><span>PATH A</span><b>Launch now</b><small>Faster learning · less polish</small></div><div><span>PATH B</span><b>Improve first</b><small>More readiness · delayed learning</small></div></div>
            <div className="previewLine short" />
            <div className="previewOutcome"><span>CHANGE A CONDITION</span><b>What if the deadline moves?</b></div>
          </div>
          <div className="previewBottom"><span>Choices <b>2</b></span><span>Drivers <b>5</b></span><span>Scenarios <b>3</b></span></div>
        </div>
      </section>

      <section className="problemBand"><div className="container split"><div><div className="eyebrow">The problem</div><h2>A vague question should not produce a confident-looking answer.</h2></div><p>Real decisions contain goals, competing choices, constraints, unknowns, and trade-offs. BRANCH asks for enough context to build a useful model first. If the context is weak, it refuses to manufacture a fake decision tree.</p></div></section>

      <section className="section container" id="how">
        <div className="sectionHeading"><div><div className="eyebrow">How BRANCH works</div><h2>From messy thought to an explorable set of paths.</h2></div><p>Language understanding structures the situation. Deterministic code keeps the simulation inspectable and repeatable. The interface focuses on consequences, not arbitrary scores.</p></div>
        <div className="steps">
          {[['01','Frame','Describe the choice, what success means, and the situation around it.'],['02','Structure','BRANCH identifies real choices and meaningful drivers — not random words.'],['03','Branch','The engine generates plausible conditions from the context you supplied.'],['04','Interrogate','Change an assumption, inspect the consequences, and challenge the trade-offs.']].map(([n,t,d]) => <article className="step" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section className="workspaceSection" id="workspace">
        <div className="container">
          <div className="sectionHeading"><div><div className="eyebrow">Decision workspace</div><h2>Don't ask BRANCH what to do. Give it something real to explore.</h2></div><p>The model is deliberately resistant to vague prompts. Better context creates better branches; missing context stays visible instead of being replaced with invented certainty.</p></div>
          <div className="workspace">
            <aside className="inputPanel panel">
              <div className="panelLabel"><span>01</span> Decision context</div>
              <textarea className="field textarea" value={decision} onChange={e => setDecision(e.target.value)} placeholder="Example: Should I launch now or wait two weeks? My goal is... I have... The main uncertainty is..." />
              <div className="contextChecklist"><span>Useful context</span><b>What are the choices?</b><b>What does success mean?</b><b>What can you afford / change?</b><b>What is uncertain?</b></div>
              <button className="btn primary full" onClick={run} disabled={busy}>{busy ? <><span className="spinner" /> Building branches…</> : <>Explore this decision <span>→</span></>}</button>
              {error && <div className="errorBox" role="alert">{error}</div>}
              <div className="examples"><div className="miniLabel">Try a complete situation</div>{examples.map(([label, text]) => <button key={label} onClick={() => setDecision(text)}><span>{label}</span>{text}</button>)}</div>
            </aside>

            <section className="modelPanel panel">
              {!analysis ? <div className="emptyState"><div className="emptyIcon">⌁</div><div className="eyebrow">Waiting for context</div><h3>Build a decision you can challenge.</h3><p>BRANCH is not a recommendation box. Give it a real choice and the conditions around that choice, then explore how different situations change the trade-offs.</p><button className="btn ghost" onClick={loadDemo}>Load a complete example</button></div> : <>
                <div className="modelHeader"><div><div className="miniLabel">Decision model</div><h3>{analysis.title}</h3><p>{analysis.summary}</p></div></div>

                {analysis.contextQuality === 'needs-context' && <div className="contextWarning"><div className="warningIcon">!</div><div><strong>This is an outcome, not a decision yet.</strong><span>BRANCH will not invent paths from a vague wish. Add the choices you are considering and the situation that makes the choice difficult.</span><ul>{analysis.missingContext.map(item => <li key={item}>{item}</li>)}</ul><div className="contextPrompt">Example: “Should I choose A or B? My goal is __. I can __. I cannot __. The biggest unknown is __.”</div></div></div>}

                {analysis.contextQuality === 'ready' && <>
                  <div className="tabs" role="tablist"><button className={activeTab === 'map' ? 'active' : ''} onClick={() => setActiveTab('map')}>Decision paths</button><button className={activeTab === 'scenarios' ? 'active' : ''} onClick={() => setActiveTab('scenarios')}>What could happen</button><button className={activeTab === 'assumptions' ? 'active' : ''} onClick={() => setActiveTab('assumptions')}>Assumptions</button></div>

                  {activeTab === 'map' && <div className="modelGrid">
                    <div className="resultCard pathCard"><div className="cardHeading"><span>Decision paths</span><span className="pill">{analysis.options.length} choices</span></div><p className="cardIntro">BRANCH keeps the choices separate from the conditions around them. There is no single “winner” here.</p><div className="pathList">{analysis.options.map((option, index) => <article className="pathItem" key={option}><div className="pathNumber">0{index + 1}</div><div><span>PATH {index + 1}</span><b>{option}</b><p>{index === 0 ? 'More direct action, with its own execution trade-offs.' : index === 1 ? 'More room to learn, wait, or improve before committing.' : 'A different commitment level that may preserve flexibility.'}</p></div></article>)}</div></div>
                    <div className="resultCard"><div className="cardHeading"><span>Decision goal</span><span className="pill">PRIMARY</span></div><p className="goalText">{analysis.goal}</p><div className="tradeoffNote"><span>CORE IDEA</span><b>There is no universal best path.</b><p>The useful question is which path still makes sense when your assumptions change.</p></div></div>
                    <div className="resultCard fullCard"><div className="cardHeading"><span>Decision drivers</span><span className="muted">Change the situation, not a mysterious score</span></div><p className="cardIntro">These are the meaningful conditions BRANCH found in your context. Move one to explore how the scenario changes.</p>{currentVariables.map(v => <label className="variable" key={v.name}><div className="variableTop"><div><b>{v.name}</b><span>{v.description}</span></div><output>{v.value <= 30 ? v.lowLabel : v.value >= 70 ? v.highLabel : 'Moderate'}</output></div><input type="range" min="0" max="100" value={v.value} onChange={e => updateValue(v.name, Number(e.target.value))} aria-label={`${v.name} level`} /><div className="rangeLabels"><span>{v.lowLabel}</span><span>{v.highLabel}</span></div></label>)}<div className="variableFooter"><button className="btn ghost small" onClick={resetAssumptions}>Reset conditions</button><span>The simulation uses these conditions to explore trade-offs; it does not turn them into probabilities.</span></div></div>
                  </div>}

                  {activeTab === 'scenarios' && <div className="scenarioView"><div className="scenarioIntro"><div><div className="miniLabel">Generated from your context</div><h3>What could happen if the situation changes?</h3><p>These are structured stress tests, not predictions. Select one to inspect the conditions, consequences, and trade-offs.</p></div></div><div className="scenarioCards">{analysis.scenarios.map(s => <button className={`scenarioCard ${selectedScenario === s.id ? 'selected' : ''}`} key={s.id} onClick={() => setSelectedScenario(s.id)}><span>{s.id === 'expected' ? 'BASELINE' : 'SCENARIO'}</span><b>{s.name}</b><p>{s.description}</p><small>{s.changes.slice(0, 3).map(c => `${c.variable}: ${c.label}`).join(' · ')}</small></button>)}</div>{selected && <div className="scenarioResult resultCard"><div className="cardHeading"><span>{selected.name}</span><span className="pill">EXPLORATION</span></div><p className="scenarioDescription">{selected.description}</p><div className="scenarioColumns"><div><h4>What changes</h4>{selected.changes.map(c => <div className="changeRow" key={c.variable}><span>{c.variable}</span><b>{c.label}</b></div>)}</div><div><h4>What this could mean</h4>{selected.effects.map(effect => <p className="bullet" key={effect}>→ {effect}</p>)}<h4 className="subhead">Trade-offs to inspect</h4>{selected.tradeoffs.map(tradeoff => <p className="bullet mutedBullet" key={tradeoff}>↳ {tradeoff}</p>)}</div></div></div>}</div>}

                  {activeTab === 'assumptions' && <div className="explainGrid"><div className="explainMain resultCard"><div className="aiBadge">✦ MODEL EXPLANATION</div><h3>What is BRANCH actually assuming?</h3><p>Every simulation is only as useful as the situation it represents. These assumptions are visible so you can challenge them.</p>{analysis.dependencies.map((dependency, i) => <div className="insight" key={dependency}><span>0{i + 1}</span><div><b>{dependency.split(' can ')[0]}</b><p>{dependency}</p></div></div>)}<div className="insight"><span>!</span><div><b>What BRANCH cannot know</b><p>Future events, private information, unexpected opportunities, and human behavior can change the real outcome. Treat the simulation as a way to think, not as a guarantee.</p></div></div></div><div className="explainSide resultCard"><div className="cardHeading"><span>Risks</span><span className="pill danger">ATTENTION</span></div>{analysis.risks.map((risk, i) => <p className="risk" key={risk}><span>0{i + 1}</span>{risk}</p>)}<div className="cardHeading second"><span>Model assumptions</span></div>{analysis.assumptions.map(assumption => <p className="assumption" key={assumption}>✓ {assumption}</p>)}</div></div>}
                </>}
              </>}
            </section>
          </div>
        </div>
      </section>

      <section className="section container useCases"><div className="eyebrow">One engine. Many decisions.</div><h2>Useful anywhere uncertainty matters.</h2><div className="useGrid">{['Startups & product launches','Career & education choices','Small-business planning','Team prioritization','Project trade-offs','Everyday complex choices'].map((item, i) => <div className="useCard" key={item}><span>0{i + 1}</span><b>{item}</b><p>Explore paths, constraints, uncertainty, and what changes the trade-off.</p></div>)}</div></section>

      <section className="finalCta"><div className="container"><div className="eyebrow">Your decision. Your assumptions. Your exploration.</div><h2>Don't ask AI what to do.<br /><span>Explore what could happen.</span></h2><button className="btn primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>Explore a decision <span>→</span></button></div></section>

      <footer className="footer"><div className="container footerInner"><span>BRANCH · Decision simulation</span><strong>Built By Koglesh R. Murugan</strong></div></footer>
    </main>
  )
}
