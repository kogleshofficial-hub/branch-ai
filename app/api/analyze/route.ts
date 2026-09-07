import { NextResponse } from 'next/server'
import { analyzeDecision, type Analysis } from '@/lib/engine'

const text=(v:unknown)=>typeof v==='string'?v.trim():''
const arr=(v:unknown)=>Array.isArray(v)?v.filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean).slice(0,8):[]

async function enrich(base:Analysis,input:string){
  const key=process.env.AI_API_KEY
  if(!key)return{analysis:base,provider:'branch-core',aiActive:false,understanding:base.summary,assistantMessage:base.summary,clarifyingQuestions:base.missingContext,confidenceLabel:base.contextQuality==='ready'?'Model ready':'More context needed'}
  const endpoint=(process.env.AI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'')+'/chat/completions'
  const model=process.env.AI_MODEL||'gpt-4o-mini'
  const system=`You are BRANCH, a careful conversational decision-intelligence assistant. Your first job is to understand and answer the user's message naturally. Do not behave like a keyword-matching form.

Rules:
- Handle questions, decisions, comparisons, goals, statements, slang, fragments, typos and unrelated topics gracefully.
- Answer whatever can reasonably be answered from the message and general knowledge. Never pretend to know current facts you were not given.
- If the message is a decision, identify the real paths. Do not invent options.
- If the message is a goal such as "I wanna become famous", say that it is a goal rather than a decision and explain what would turn it into a decision.
- If the message is a topic/person such as "Ishowspeed", acknowledge what it appears to refer to and invite the user to state the decision or question they have. Never turn random words into variables.
- If there are real paths but important context is missing, give a useful broad comparison first, then ask only the most relevant missing questions.
- Do not show numeric scores, percentages, confidence percentages, or fake probabilities.
- For a ready decision, explain likely consequences, trade-offs, dependencies, and a conditional recommendation. The deterministic BRANCH model is authoritative for its extracted paths and condition variables; do not invent new paths.
- Distinguish user-provided facts from assumptions.
- Do not fabricate current visa rules, prices, statistics, people, events, or other time-sensitive facts.
- Keep the tone clear, human, concise and useful.

Return JSON only with: intent, understanding, assistantMessage, clarifyingQuestions, summary, goal, risks, assumptions, recommendation, recommendationReason, nextStep, confidenceLabel.
intent must be one of: decision, comparison, planning, goal, outcome, question, statement, topic, incomplete_decision, irrelevant_or_unclear.
clarifyingQuestions must be an array of at most 5 short questions. recommendation must be empty unless the deterministic model has a recommendation and your recommendation exactly matches one of its existing options.`
  const payload={model,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({userMessage:input,deterministicModel:{options:base.options,goal:base.goal,variables:base.variables.map(v=>({name:v.name,value:v.value,description:v.description,lowLabel:v.lowLabel,highLabel:v.highLabel})),ready:base.contextQuality==='ready',recommendation:base.recommendation}})}],temperature:0.2,response_format:{type:'json_object'}}
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),cache:'no-store'})
    if(!response.ok)throw new Error(`AI provider returned ${response.status}`)
    const json=await response.json();const raw=json?.choices?.[0]?.message?.content
    const parsed=typeof raw==='string'?JSON.parse(raw):raw
    const recommendation=base.options.includes(text(parsed?.recommendation))?text(parsed?.recommendation):base.recommendation
    const recommendationReason=text(parsed?.recommendationReason)||base.recommendationReason
    const merged={...base,summary:text(parsed?.summary)||base.summary,goal:text(parsed?.goal)||base.goal,risks:arr(parsed?.risks).length?arr(parsed?.risks):base.risks,assumptions:arr(parsed?.assumptions).length?arr(parsed?.assumptions):base.assumptions,recommendation,recommendationReason,nextStep:text(parsed?.nextStep)||base.nextStep}
    return{analysis:merged,provider:'ai-enriched',aiActive:true,model,intent:text(parsed?.intent)||'decision',understanding:text(parsed?.understanding)||base.summary,assistantMessage:text(parsed?.assistantMessage)||base.summary,clarifyingQuestions:arr(parsed?.clarifyingQuestions).slice(0,5),confidenceLabel:text(parsed?.confidenceLabel)|| (base.contextQuality==='ready'?'Model ready':'More context needed')}
  }catch{return{analysis:base,provider:'branch-core-fallback',aiActive:false,understanding:base.summary,assistantMessage:base.summary,clarifyingQuestions:base.missingContext,confidenceLabel:base.contextQuality==='ready'?'Model ready':'More context needed'}}
}

export async function POST(request:Request){
  try{
    const body=await request.json();const decision=text(body?.decision)
    if(decision.length<1||decision.length>6000)return NextResponse.json({error:'Tell BRANCH what is on your mind — a question, decision, goal, or situation.'},{status:400})
    return NextResponse.json(await enrich(analyzeDecision(decision),decision))
  }catch{return NextResponse.json({error:'BRANCH could not process that message. Try again.'},{status:500})}
}
