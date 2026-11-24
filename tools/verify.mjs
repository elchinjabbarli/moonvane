import { generateLevel, allSatisfied, solve, bearing } from "../js/engine.js";
const capsOf=L=>{const m=new Map();for(const e of L.inv)m.set(e.c+":"+e.k,e.n);return m;};
let fails=0,det=0,ref=0,tie=0,uni=0;
for(let id=1;id<=1000;id++){const L=generateLevel(id);
 if(!allSatisfied(L,L.solution))fails++;
 if(L.inv.reduce((a,e)=>a+e.n,0)!==L.par)fails++;
 const objs=L.fixed.concat(L.solution);for(const m of L.moths){const b=bearing(m.x,m.y,m.c,objs);if(!b||b==="tie")tie++;}
 if(JSON.stringify(L)!==JSON.stringify(generateLevel(id)))det++;
 if(!solve(L,L.par,capsOf(L),80000,false).sol)ref++;
 if(id<=120&&solve(L,L.par,capsOf(L),80000,true).solutions!==1)uni++;}
console.log({fails,det,ref,tie,uni});if(fails+det+ref+tie+uni>0)process.exit(1);console.log("ALL 1000 LEVELS OK");