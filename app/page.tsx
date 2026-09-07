'use client'

import { useMemo, useState } from 'react'
import { analyzeDecision, scoreOption, type Analysis } from '@/lib/engine'

const demo = `I am deciding whether to launch a new study-planning product this month or spend two more weeks improving it. I have a small two-person team, a limited budget, and want to maximize the chance of sustainable adoption without missing the school-year window.`

export default function Home(){
 const [decision,setDecision]=useState('')
 const [analysis,setAnalysis]=useState<Analysis|null>(null)
 const [busy,setBusy]=useState(false)
 const [scenario,setScenario]=useState(0)
 const [error,setError]=useState('')
 const scenarios=['Baseline','High demand','Tight budget']

 const scores=useMemo(()=>analysis?analysis.options.map((_,i)=>scoreOption(i,analysis.variables,scenario===1?8:scenario===2?-7:0)):[0,0,0], [analysis,scenario])

 async function run(){
  setError(''); if(decision.trim().length<20){setError('Give BRANCH a little more context so it can model the decision.');return}
  setBusy(true)
  try{const res=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision})});const data=await res.json();if(!res.ok)throw new Error(data.error);setAnalysis(data.analysis)}catch(e){setError(e instanceof Error?e.message:'Something went wrong.')}finally{setBusy(false)}
 }
 function loadDemo(){setDecision(demo);setAnalysis(null);setError('')}
 return <main className="shell">
  <nav className="nav"><div className="brand"><div className="mark">B</div>BRANCH</div><div className="navlink">Decision intelligence · Built for real choices</div></nav>
  <section className="container hero">
   <div><div className="eyebrow">Decision intelligence</div><h1>Don't just get an answer.<br/><span>Explore the decision.</span></h1><p>BRANCH turns complex decisions into structured, interactive models. Surface options, assumptions, risks and high-impact variables — then test what changes before you commit.</p><div className="actions"><button className="btn primary" onClick={()=>document.getElementById('workspace')?.scrollIntoView({behavior:'smooth'})}>Build a decision</button><button className="btn ghost" onClick={loadDemo}>Load demo</button></div></div>
   <div className="heroCard"><div className="miniLabel">Live model preview</div><div className="decisionBox"><strong>Should we launch now?</strong><span className="muted">2 options · 5 variables · 3 risks</span></div><div className="graph"><div className="line" style={{left:'29%',top:'48%',width:'44%',transform:'rotate(-18deg)'}}/><div className="line" style={{left:'29%',top:'50%',width:'45%',transform:'rotate(18deg)'}}/><div className="line" style={{left:'55%',top:'50%',width:'32%',transform:'rotate(0deg)'}}/><div className="node" style={{left:'1%',top:'40%'}}><b>Decision</b>Launch?</div><div className="node" style={{left:'47%',top:'8%'}}><b>Demand</b>High impact</div><div className="node" style={{left:'47%',top:'65%'}}><b>Budget</b>Constraint</div><div className="node" style={{left:'76%',top:'40%'}}><b>Outcome</b>Score 82</div></div><div className="stats"><div className="stat"><b>7</b><span>Variables</span></div><div className="stat"><b>3</b><span>Risks</span></div><div className="stat"><b>4</b><span>Paths</span></div></div></div>
  </section>
  <section className="container section" id="workspace"><div className="sectionTitle">Decision workspace</div><p className="sectionSub">Describe the real situation. BRANCH structures it into a model you can inspect and test.</p>
   <div className="workspace"><aside className="panel"><label className="label">Decision context</label><textarea className="field textarea" value={decision} onChange={e=>setDecision(e.target.value)} placeholder="Example: Should our team launch now or wait two weeks? Include goals, constraints, resources, deadlines and anything uncertain."/><button className="btn primary space" style={{width:'100%'}} onClick={run} disabled={busy}>{busy?'Building model…':'Analyze decision'}</button>{error&&<p className="muted space" style={{color:'#ff9b9b'}}>{error}</p>}<div className="space"><span className="miniLabel">Good input includes</span><p className="muted">Goal · options · constraints · resources · uncertainty · deadline</p></div></aside>
   <div className="panel">{!analysis?<div style={{padding:'70px 20px',textAlign:'center'}}><div className="eyebrow">Ready</div><h2 style={{letterSpacing:'-.03em'}}>Build your first decision model</h2><p className="muted">Your analysis will appear here with options, variables, risks and an interactive scenario view.</p></div>:<>
    <div className="analysisHeader"><div><div className="miniLabel">Model generated</div><h2 style={{margin:'6px 0 5px',letterSpacing:'-.03em'}}>Decision intelligence map</h2><p className="muted">{analysis.summary}</p></div><span className="pill">CORE ENGINE</span></div>
    <div className="resultGrid"><div className="result"><h3>High-impact variables</h3>{analysis.variables.map(v=><div className="option" key={v.name}><strong>{v.name}</strong><div className="bar"><i style={{width:`${v.impact}%`}}/></div></div>)}</div><div className="result"><h3>Risks & assumptions</h3>{analysis.risks.map(r=><p key={r} style={{margin:'9px 0'}}>{r}</p>)}<div style={{borderTop:'1px solid #222b37',marginTop:12,paddingTop:10}}><span className="miniLabel">Assumptions</span>{analysis.assumptions.map(a=><p className="muted" key={a} style={{margin:'7px 0'}}>• {a}</p>)}</div></div></div>
    <div className="space" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><div className="miniLabel">Scenario simulator</div><h3 style={{margin:'5px 0'}}>What changes if the world changes?</h3></div><div style={{display:'flex',gap:6}}>{scenarios.map((s,i)=><button key={s} className={`btn ${scenario===i?'primary':'ghost'}`} onClick={()=>setScenario(i)} style={{padding:'7px 10px',fontSize:11}}>{s}</button>)}</div></div>
    <div className="resultGrid">{analysis.options.map((o,i)=><div className="result" key={o}><div style={{display:'flex',justifyContent:'space-between'}}><h3>{o}</h3><strong>{scores[i]}%</strong></div><div className="bar"><i style={{width:`${scores[i]}%`}}/></div><p style={{marginTop:9}}>Scenario score based on the current model and selected assumptions. This is an explainable model, not a promise of future results.</p></div>)}</div>
   </>}</div></div>
  </section>
  <footer className="footer"><div className="container"><strong>BRANCH</strong> · Decision intelligence for uncertain choices. <span style={{float:'right'}}>Built By Koglesh R. Murugan</span></div></footer>
 </main>
}
