export type Analysis = { options:string[]; variables:{name:string;impact:number}[]; risks:string[]; assumptions:string[]; dependencies:string[]; summary:string }

const STOP = new Set(['the','and','that','with','from','this','have','will','would','should','could','into','about','there','their','then','than','for','are','was','were','you','your','our','what','when','where','which','because','while','using','need','want','make','more','less','also'])

function terms(text:string){return [...new Set((text.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(w=>!STOP.has(w)))].slice(0,12)}

export function analyzeDecision(input:string):Analysis{
 const t=terms(input)
 const options = input.match(/\b(?:option|choice|alternative)\s+[a-z0-9]+/gi)?.slice(0,4) || ['Proceed now','Delay and improve','Run a smaller pilot']
 const variables=(t.length? t.slice(0,5):['cost','time','demand','capacity','risk']).map((name,i)=>({name,impact:88-i*11}))
 const risks=['Uncertain assumptions may change the preferred option','Limited resources can amplify downside risk','Important variables may be correlated rather than independent']
 const assumptions=['The stated constraints are accurate','The available information is representative','The decision objective is the primary success criterion']
 const dependencies=variables.slice(0,3).map(v=>`${v.name} influences outcome`)
 return {options,variables,risks,assumptions,dependencies,summary:`BRANCH converted your decision into ${options.length} candidate paths and ${variables.length} high-impact variables. Explore the assumptions before committing.`}
}

export function scoreOption(index:number, variables:{name:string;impact:number}[], scenarioBias=0){
 const base=[82,72,64,57][index%4]
 const variableEffect=variables.reduce((s,v)=>s+v.impact,0)/Math.max(variables.length,1)
 return Math.max(1,Math.min(99,Math.round(base+variableEffect/10-6+scenarioBias)))
}
