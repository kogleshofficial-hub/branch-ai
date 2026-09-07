import { NextResponse } from 'next/server'
import { analyzeDecision } from '@/lib/engine'

export async function POST(request:Request){
 try{
  const body=await request.json()
  const decision=typeof body?.decision==='string'?body.decision.trim():''
  if(decision.length<20) return NextResponse.json({error:'Describe the decision in at least 20 characters.'},{status:400})
  // The deterministic engine guarantees a usable result. An LLM provider can be
  // layered here later for richer extraction without making the core product fragile.
  return NextResponse.json({analysis:analyzeDecision(decision),engine:'branch-core'})
 }catch{return NextResponse.json({error:'Unable to analyze this decision right now.'},{status:500})}
}
