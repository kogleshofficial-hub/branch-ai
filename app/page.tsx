'use client'

import { useMemo, useState } from 'react'
import { analyzeDecision, scoreOption, type Analysis } from '@/lib/engine'

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
  const [activeTab, setActiveTab] = useState<'model' | 'scenarios' | 'explain'>('model')
  const [selectedScenario, setSelectedScenario] = useState('expected')

  const currentVariables = useMemo(() => analysis?.variables.map(v => ({ ...v, value: values[v.name] ?? v.value })) ?? [], [analysis, values])
  const scores = useMemo(() => analysis?.options.map((_, i) => scoreOption(i, currentVariables)) ?? [], [analysis, currentVariables])
  const winner = scores.length ? scores.indexOf(Math.max(...scores)) : -1
  const selected = analysis?.scenarios.find(s => s.id === selectedScenario) ?? analysis?.scenarios[1]

  async function run() {
    setError('')
    if (decision.trim().length < 20) { setError('Give BRANCH enough context to model the decision.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to build the model.')
      setAnalysis(data.analysis)
      setValues(Object.fromEntries(data.analysis.variables.map((v: Analysis['variables'][number]) => [v.name, v.value])))
      setSelectedScenario('expected')
      setActiveTab('model')
      document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Try again.') }
    finally { setBusy(false) }
  }

  function loadDemo() { setDecision(demo); setAnalysis(null); setError(''); window.setTimeout(() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }), 20) }
  function updateValue(name: string, value: number) { setValues(prev => ({ ...prev, [name]: value })); setSelectedScenario('expected') }
  function resetModel() { if (analysis) setValues(Object.fromEntries(analysis.variables.map(v => [v.name, v.value]))) }

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
          <p>BRANCH turns a complicated choice into a transparent model of options, constraints, uncertainty, and trade-offs. It does not pretend to know the future — it helps you test the assumptions behind your choice.</p>
          <div className="actions"><button className="btn primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>Build a decision <span>→</span></button><button className="btn ghost" onClick={loadDemo}>See a live example</button></div>
          <div className="trustRow"><span>● Core simulation is free</span><span>● No credit system</span><span>● Transparent scoring</span></div>
        </div>
        <div className="heroCard" aria-label="BRANCH model preview">
          <div className="cardTop"><div><div className="miniLabel">Decision model</div><strong>Launch now or improve?</strong></div><span className="liveDot">● READY</span></div>
          <div className="flow"><div className="flowNode mainNode"><b>Decision</b><span>Choose a path</span></div><div className="connector c1" /><div className="flowNode f1"><b>Variable</b><span>Demand</span></div><div className="connector c2" /><div className="flowNode f2"><b>Constraint</b><span>Deadline</span></div><div className="connector c3" /><div className="flowNode outcome"><b>Outcome</b><span>Compare</span></div></div>
          <div className="previewBottom"><span>Options <b>2</b></span><span>Variables <b>5</b></span><span>Scenarios <b>3</b></span></div>
        </div>
      </section>

      <section className="problemBand"><div className="container split"><div><div className="eyebrow">The problem</div><h2>A vague question should not produce a fake answer.</h2></div><p>Real decisions contain goals, competing options, constraints, unknowns, and trade-offs. BRANCH asks for enough context to build a model first, then lets you change the assumptions and see how the result moves.</p></div></section>

      <section className="section container" id="how">
        <div className="sectionHeading"><div><div className="eyebrow">How BRANCH works</div><h2>From messy thought to an explorable model.</h2></div><p>AI can structure language; deterministic code handles the scoring. That separation makes the result inspectable, repeatable, and easier to challenge.</p></div>
        <div className="steps">
          {[['01','Frame','Describe the decision, what success means, the choices you are considering, and what constrains you.'],['02','Structure','BRANCH maps meaningful decision variables instead of blindly turning every word into a slider.'],['03','Generate','The model creates context-based scenarios automatically: favorable, expected, and constrained.'],['04','Interrogate','Change an assumption, compare paths, inspect risks, and understand why the relative result moved.']].map(([n,t,d]) => <article className="step" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section className="workspaceSection" id="workspace">
        <div className="container">
          <div className="sectionHeading"><div><div className="eyebrow">Decision workspace</div><h2>Put a real decision under the microscope.</h2></div><p>Give BRANCH context. If the input is too vague, it will tell you what is missing instead of inventing a confident-looking answer.</p></div>
          <div className="workspace">
            <aside className="inputPanel panel">
              <div className="panelLabel"><span>01</span> Decision context</div>
              <textarea className="field textarea" value={decision} onChange={e => setDecision(e.target.value)} placeholder="Example: Should I launch now or wait two weeks? My goal is... I have... The main uncertainty is..." />
              <div className="contextChecklist"><span>Strong context includes</span><b>Decision + options</b><b>Goal / success criteria</b><b>Constraints / resources</b><b>Timing / uncertainty</b></div>
              <button className="btn primary full" onClick={run} disabled={busy}>{busy ? <><span className="spinner" /> Building model…</> : <>Analyze decision <span>→</span></>}</button>
              {error && <div className="errorBox" role="alert">{error}</div>}
              <div className="examples"><div className="miniLabel">Try a realistic example</div>{examples.map(([label, text]) => <button key={label} onClick={() => setDecision(text)}><span>{label}</span>{text}</button>)}</div>
            </aside>

            <section className="modelPanel panel">
              {!analysis ? <div className="emptyState"><div className="emptyIcon">⌁</div><div className="eyebrow">Waiting for context</div><h3>Build a decision model you can challenge.</h3><p>Do not give BRANCH a single keyword or wish. Give it the situation around the choice. The model should be useful because the context is useful.</p><button className="btn ghost" onClick={loadDemo}>Load a complete example</button></div> : <>
                <div className="modelHeader"><div><div className="miniLabel">Model analysis</div><h3>{analysis.title}</h3><p>{analysis.summary}</p></div><div className="confidence"><b>{analysis.confidence}%</b><span>context confidence</span></div></div>
                {analysis.contextQuality === 'needs-context' && <div className="contextWarning"><div><strong>More context needed before BRANCH scores this.</strong><span>That is intentional. A statement like “I want to meet someone” describes an outcome, not a decision.</span></div><ul>{analysis.missingContext.map(item => <li key={item}>{item}</li>)}</ul><div className="contextPrompt">Try: “Should I attend event A or wait for event B? My goal is to meet them. I can travel on weekends, have a limited budget, and do not know where they will appear.”</div></div>}
                {analysis.contextQuality === 'ready' && <>
                  <div className="tabs" role="tablist"><button className={activeTab === 'model' ? 'active' : ''} onClick={() => setActiveTab('model')}>Decision map</button><button className={activeTab === 'scenarios' ? 'active' : ''} onClick={() => setActiveTab('scenarios')}>Generated scenarios</button><button className={activeTab === 'explain' ? 'active' : ''} onClick={() => setActiveTab('explain')}>Why this result</button></div>

                  {activeTab === 'model' && <div className="modelGrid">
                    <div className="mapCard resultCard"><div className="cardHeading"><span>Decision map</span><span className="pill">{analysis.options.length} paths</span></div><div className="decisionMap"><div className="mapDecision"><span>DECISION</span><b>{analysis.title.slice(0, 64)}</b></div><div className="mapBranches">{analysis.options.map((option, i) => <div className={`mapOption ${i === winner ? 'winner' : ''}`} key={option}><span>PATH {i + 1}</span><b>{option}</b><strong>{scores[i]}<small>/100</small></strong></div>)}</div></div></div>
                    <div className="resultCard"><div className="cardHeading"><span>Decision goal</span><span className="pill">PRIMARY</span></div><p className="goalText">{analysis.goal}</p><div className="metric"><span>Current leading path</span><b>{winner >= 0 ? analysis.options[winner] : '—'}</b></div><div className="metric"><span>Current score</span><b>{winner >= 0 ? `${scores[winner]}/100` : '—'}</b></div></div>
                    <div className="resultCard fullCard"><div className="cardHeading"><span>Meaningful variables</span><span className="muted">Adjust assumptions, not random keywords</span></div>{currentVariables.map(v => <label className="variable" key={v.name}><div><b>{v.name}</b><span>{v.description} · {v.impact}% impact</span></div><output>{v.value}</output><input type="range" min="0" max="100" value={v.value} onChange={e => updateValue(v.name, Number(e.target.value))} aria-label={`${v.name} value`} /></label>)}<div className="variableFooter"><button className="btn ghost small" onClick={resetModel}>Reset assumptions</button><span>Scores recalculate locally and deterministically.</span></div></div>
                  </div>}

                  {activeTab === 'scenarios' && <div className="scenarioView"><div className="scenarioIntro"><div><div className="miniLabel">Generated from your context</div><h3>What could happen if the situation changes?</h3><p>These scenarios are not predictions. They are structured stress tests built from the variables BRANCH identified.</p></div></div><div className="scenarioCards">{analysis.scenarios.map(s => <button className={`scenarioCard ${selectedScenario === s.id ? 'selected' : ''}`} key={s.id} onClick={() => setSelectedScenario(s.id)}><div><span>{s.id === 'expected' ? 'BASELINE' : 'STRESS TEST'}</span><b>{s.name}</b></div><p>{s.description}</p><small>{s.changes.map(c => `${c.variable}: ${c.value}`).join(' · ')}</small></button>)}</div>{selected && <div className="scenarioResult resultCard"><div className="cardHeading"><span>{selected.name}</span><span className="pill">SIMULATION</span></div><p className="scenarioDescription">{selected.description}</p>{analysis.options.map((option, i) => <div className={`compareRow ${i === selected.scores.indexOf(Math.max(...selected.scores)) ? 'best' : ''}`} key={option}><div><span>OPTION {i + 1}</span><b>{option}</b></div><div className="compareBar"><i style={{ width: `${selected.scores[i]}%` }} /></div><strong>{selected.scores[i]}</strong><small>/100</small></div>)}</div>}</div>}

                  {activeTab === 'explain' && <div className="explainGrid"><div className="explainMain resultCard"><div className="aiBadge">✦ DECISION EXPLANATION</div><h3>What is driving the current result?</h3><p>The leading path is <b>{winner >= 0 ? analysis.options[winner] : 'still being evaluated'}</b> at <b>{winner >= 0 ? scores[winner] : 0}/100</b>. The score is a transparent model output, not a probability of success.</p>{currentVariables.slice(0, 4).map((v, i) => <div className="insight" key={v.name}><span>0{i + 1}</span><div><b>{v.name}</b><p>{v.description} It currently has {v.impact}% impact weight and is set to {v.value}/100.</p></div></div>)}<div className="insight"><span>!</span><div><b>Important limitation</b><p>BRANCH supports reasoning under uncertainty. It cannot know future events and should not be treated as medical, legal, financial, or safety advice.</p></div></div></div><div className="explainSide resultCard"><div className="cardHeading"><span>Risks</span><span className="pill danger">ATTENTION</span></div>{analysis.risks.map((r, i) => <p className="risk" key={r}><span>0{i + 1}</span>{r}</p>)}<div className="cardHeading second"><span>Model assumptions</span></div>{analysis.assumptions.map(a => <p className="assumption" key={a}>✓ {a}</p>)}</div></div>}
                </>}
              </>}
            </section>
          </div>
        </div>
      </section>

      <section className="section container useCases"><div className="eyebrow">One engine. Many decisions.</div><h2>Useful anywhere uncertainty matters.</h2><div className="useGrid">{['Startups & product launches','Career & education choices','Small-business planning','Team prioritization','Project trade-offs','Everyday complex choices'].map((x, i) => <div className="useCard" key={x}><span>0{i + 1}</span><b>{x}</b><p>Model options, constraints, risks, and what-if scenarios.</p></div>)}</div></section>

      <section className="finalCta"><div className="container"><div className="eyebrow">Your decision. Your assumptions. Your exploration.</div><h2>Don't ask AI what to do.<br /><span>Explore what could happen.</span></h2><button className="btn primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>Build a decision <span>→</span></button></div></section>

      <footer className="footer"><div className="container footerInner"><div><strong>BRANCH</strong><span>Decision intelligence for uncertain choices.</span></div><div className="credit">Built By Koglesh R. Murugan</div></div></footer>
    </main>
  )
}
