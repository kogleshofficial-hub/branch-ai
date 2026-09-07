'use client'

import { useMemo, useState } from 'react'
import { analyzeDecision, explainChange, scoreOption, type Analysis } from '@/lib/engine'

const demo = `Should I launch my SaaS this month or spend two more weeks improving it? I have a two-person team, a limited budget, a school-year deadline, and want to maximize sustainable adoption without sacrificing product quality.`

const examples = [
  ['Startup', 'Should we launch now or keep improving for two weeks?'],
  ['Career', 'Should I accept this opportunity now or wait for a better fit?'],
  ['Product', 'Should our team build feature A or feature B first?'],
]

export default function Home() {
  const [decision, setDecision] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [values, setValues] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'model' | 'scenarios' | 'explain'>('model')
  const [scenario, setScenario] = useState<'baseline' | 'upside' | 'pressure'>('baseline')

  const currentVariables = useMemo(() => analysis?.variables.map(v => ({ ...v, value: values[v.name] ?? v.value })) ?? [], [analysis, values])
  const bias = scenario === 'upside' ? 5 : scenario === 'pressure' ? -6 : 0
  const scores = useMemo(() => analysis ? analysis.options.map((_, i) => scoreOption(i, currentVariables, bias)) : [], [analysis, currentVariables, bias])
  const winner = analysis && scores.length ? scores.indexOf(Math.max(...scores)) : -1
  const baselineScores = useMemo(() => analysis ? analysis.options.map((_, i) => scoreOption(i, analysis.variables)) : [], [analysis])

  async function run() {
    setError('')
    if (decision.trim().length < 20) { setError('Add a little more context — include the decision, options, goal, and constraints.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Unable to build the model.')
      setAnalysis(data.analysis)
      setValues(Object.fromEntries(data.analysis.variables.map((v: Analysis['variables'][number]) => [v.name, v.value])))
      setActiveTab('model')
      document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Try again.') }
    finally { setBusy(false) }
  }

  function loadDemo() { setDecision(demo); setAnalysis(null); setError(''); window.setTimeout(() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }), 20) }
  function updateValue(name: string, value: number) { setValues(prev => ({ ...prev, [name]: value })) }
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
          <p>BRANCH turns messy real-world choices into interactive models of options, assumptions, risks, and variables — so you can test what happens when the situation changes.</p>
          <div className="actions"><button className="btn primary" onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}>Build a decision <span>→</span></button><button className="btn ghost" onClick={loadDemo}>See a live example</button></div>
          <div className="trustRow"><span>● Core simulation is free</span><span>● No credit system</span><span>● Built for real-world choices</span></div>
        </div>
        <div className="heroCard" aria-label="BRANCH model preview">
          <div className="cardTop"><div><div className="miniLabel">Live model</div><strong>Launch decision</strong></div><span className="liveDot">● MODEL READY</span></div>
          <div className="flow"><div className="flowNode mainNode"><b>Decision</b><span>Launch now?</span></div><div className="connector c1" /><div className="flowNode f1"><b>Demand</b><span>High impact</span></div><div className="connector c2" /><div className="flowNode f2"><b>Risk</b><span>Execution</span></div><div className="connector c3" /><div className="flowNode outcome"><b>Outcome</b><span>82 / 100</span></div></div>
          <div className="previewBottom"><span>Assumptions <b>3</b></span><span>Variables <b>7</b></span><span>Scenarios <b>4</b></span></div>
        </div>
      </section>

      <section className="problemBand"><div className="container split"><div><div className="eyebrow">The problem</div><h2>Complex decisions are rarely just questions.</h2></div><p>They contain uncertainty, competing goals, limited resources, deadlines, and hidden assumptions. Most tools give you information or a recommendation. BRANCH gives you a model you can interrogate.</p></div></section>

      <section className="section container" id="how">
        <div className="sectionHeading"><div><div className="eyebrow">How BRANCH works</div><h2>From messy thought to an explorable model.</h2></div><p>AI helps structure the decision. Deterministic code handles the scoring, so changing an assumption produces transparent, repeatable calculations.</p></div>
        <div className="steps">
          {[['01','Describe','Write the decision naturally. Include your goal, constraints, resources, deadline, and uncertainty.'],['02','Structure','BRANCH extracts candidate options, variables, assumptions, risks, and dependencies into a decision model.'],['03','Simulate','Move assumptions and compare scenarios. The scoring engine recalculates outcomes instantly.'],['04','Understand','See what changed, which variables matter, and where the model is uncertain.']].map(([n,t,d]) => <article className="step" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section className="workspaceSection" id="workspace">
        <div className="container">
          <div className="sectionHeading"><div><div className="eyebrow">Decision workspace</div><h2>Put a real decision under the microscope.</h2></div><p>Nothing is hidden behind a black-box recommendation. Explore the model and change the assumptions yourself.</p></div>
          <div className="workspace">
            <aside className="inputPanel panel">
              <div className="panelLabel"><span>01</span> Decision context</div>
              <textarea className="field textarea" value={decision} onChange={e => setDecision(e.target.value)} placeholder="Example: Should our team launch now or wait two weeks? Tell BRANCH what you are deciding, what you want, and what constrains you." />
              <button className="btn primary full" onClick={run} disabled={busy}>{busy ? <><span className="spinner" /> Building model…</> : <>Analyze decision <span>→</span></>}</button>
              {error && <div className="errorBox" role="alert">{error}</div>}
              <div className="inputHint"><strong>Better context → better model</strong><span>Goal · options · budget · resources · deadline · uncertainty</span></div>
              <div className="examples"><div className="miniLabel">Try an example</div>{examples.map(([label, text]) => <button key={label} onClick={() => setDecision(text)}><span>{label}</span>{text}</button>)}</div>
            </aside>

            <section className="modelPanel panel">
              {!analysis ? <div className="emptyState"><div className="emptyIcon">⌁</div><div className="eyebrow">Waiting for a decision</div><h3>Your decision model will appear here.</h3><p>Enter a real choice on the left, or load the example above. BRANCH will build the model in seconds.</p><button className="btn ghost" onClick={loadDemo}>Load demo decision</button></div> : <>
                <div className="modelHeader"><div><div className="miniLabel">Model generated</div><h3>{analysis.title}</h3><p>{analysis.summary}</p></div><div className="confidence"><b>{analysis.confidence}%</b><span>model confidence</span></div></div>
                <div className="tabs" role="tablist"><button className={activeTab === 'model' ? 'active' : ''} onClick={() => setActiveTab('model')}>Decision map</button><button className={activeTab === 'scenarios' ? 'active' : ''} onClick={() => setActiveTab('scenarios')}>Scenarios</button><button className={activeTab === 'explain' ? 'active' : ''} onClick={() => setActiveTab('explain')}>AI explanation</button></div>

                {activeTab === 'model' && <div className="modelGrid">
                  <div className="mapCard resultCard"><div className="cardHeading"><span>Decision map</span><span className="pill">{analysis.options.length} paths</span></div><div className="decisionMap"><div className="mapDecision"><span>DECISION</span><b>{analysis.title.slice(0, 38)}</b></div><div className="mapBranches">{analysis.options.map((option, i) => <div className={`mapOption ${i === winner ? 'winner' : ''}`} key={option}><span>PATH {i + 1}</span><b>{option}</b><strong>{scores[i]}<small>/100</small></strong></div>)}</div></div></div>
                  <div className="resultCard"><div className="cardHeading"><span>Goal</span><span className="pill">PRIMARY</span></div><p className="goalText">{analysis.goal}</p><div className="metric"><span>Preferred path</span><b>{winner >= 0 ? analysis.options[winner] : '—'}</b></div><div className="metric"><span>Highest score</span><b>{winner >= 0 ? `${scores[winner]}/100` : '—'}</b></div></div>
                  <div className="resultCard fullCard"><div className="cardHeading"><span>Variables</span><span className="muted">Drag to test the world changing</span></div>{currentVariables.map(v => <label className="variable" key={v.name}><div><b>{v.name}</b><span>{v.direction === 'negative' ? 'Lower is better' : v.direction === 'positive' ? 'Higher is better' : 'Context dependent'} · {v.impact}% impact</span></div><output>{v.value}</output><input type="range" min="0" max="100" value={v.value} onChange={e => updateValue(v.name, Number(e.target.value))} aria-label={`${v.name} value`} /></label>)}</div>
                </div>}

                {activeTab === 'scenarios' && <div className="scenarioView"><div className="scenarioControls"><div className="scenarioTitle"><div><div className="miniLabel">What changes if the world changes?</div><h3>Scenario simulator</h3></div><button className="btn ghost small" onClick={resetModel}>Reset assumptions</button></div><div className="scenarioButtons">{([['baseline','Baseline','Current assumptions'],['upside','Upside','Favorable conditions'],['pressure','Pressure','Tighter conditions']] as const).map(([id, name, desc]) => <button className={scenario === id ? 'selected' : ''} key={id} onClick={() => setScenario(id)}><b>{name}</b><span>{desc}</span></button>)}</div></div><div className="comparison">{analysis.options.map((option, i) => <div className={`compareRow ${i === winner ? 'best' : ''}`} key={option}><div><span>OPTION {i + 1}</span><b>{option}</b></div><div className="compareBar"><i style={{ width: `${scores[i]}%` }} /></div><strong>{scores[i]}</strong><small>{scores[i] - baselineScores[i] >= 0 ? '+' : ''}{scores[i] - baselineScores[i]} vs baseline</small></div>)}</div></div>}

                {activeTab === 'explain' && <div className="explainGrid"><div className="explainMain resultCard"><div className="aiBadge">✦ AI EXPLANATION</div><h3>What is driving the current result?</h3><p>BRANCH combines the structured decision model with transparent simulation outputs. The current preferred path is <b>{winner >= 0 ? analysis.options[winner] : 'still being evaluated'}</b> at <b>{winner >= 0 ? scores[winner] : 0}/100</b>.</p><div className="insight"><span>01</span><div><b>Most influential variables</b><p>{currentVariables.slice(0, 3).map(v => v.name).join(' · ')}</p></div></div><div className="insight"><span>02</span><div><b>Why scores can move</b><p>Changing a high-impact variable changes the weighted model. BRANCH recalculates instead of inventing a new recommendation.</p></div></div><div className="insight"><span>03</span><div><b>Important limitation</b><p>This is a decision-support model, not a guarantee or financial, medical, legal, or professional prediction.</p></div></div></div><div className="explainSide resultCard"><div className="cardHeading"><span>Risks</span><span className="pill danger">ATTENTION</span></div>{analysis.risks.map((r, i) => <p className="risk" key={r}><span>0{i + 1}</span>{r}</p>)}<div className="cardHeading second"><span>Assumptions</span></div>{analysis.assumptions.map(a => <p className="assumption" key={a}>✓ {a}</p>)}</div></div>}
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
