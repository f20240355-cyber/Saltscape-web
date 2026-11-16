'use strict';
// SaltScape: an educational water / root-zone salt mass-balance demonstration.
// No measured field values, real yield prediction, or ECe inference is implied.
const CROPS=[
 {name:'Lettuce',id:'A',kc:.9,color:'#80e6c0',sensitivity:1.35,initialSalt:.18,icon:'🥬'},
 {name:'Tomato',id:'B',kc:1.05,color:'#f3c67e',sensitivity:1.0,initialSalt:.18,icon:'🍅'},
 {name:'Barley',id:'C',kc:.78,color:'#83bbec',sensitivity:.65,initialSalt:.18,icon:'🌾'}
];
const AREA=1000; // m² per demonstration field
const ROOT_CAP=130; // mm root zone storage capacity, illustrative
const ROOT_INIT=85; // mm initially stored water
const MIN_ROOT=35; // below this, crop demand begins to be unmet in simplified model
const DAILY_IRRIGATION_EFF=.90;
const SALT_EC_APPROX=.64; // grams/L per dS/m; rough TDS conversion, strongly composition dependent
const BASE_WEEKLY_ET0=5.5*7;
let current=null;let optimized=null;let lastHumanShares=[35,35,30];
const $=id=>document.getElementById(id);
const fmt=(x,d=1)=>Number(x).toFixed(d);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function readConfig(){return {shortage:+$('shortage').value,ecw:+$('ecw').value,eto:+$('eto').value};}
function demands(cfg){return CROPS.map(c=>c.kc*cfg.eto*7*AREA/1000);} // m3 per week
function resources(cfg){const d=demands(cfg);return {d,budget:d.reduce((a,b)=>a+b,0)*(1-cfg.shortage/100)};}
function shares(){return CROPS.map(c=>+$('share-'+c.id).value);}
function sharesAreValid(s){return Math.abs(s.reduce((a,b)=>a+b,0)-100)<.001;}
function weekModel(cfg,s){
 const {d,budget}=resources(cfg);const records=CROPS.map((crop,i)=>{
   let store=ROOT_INIT; // mm soil-root-zone water (1 mm = 1 L/m2)
   let salt=crop.initialSalt; // kg/m² of salt initially in the root zone
   let shortfall=0;let drained=0;let irrigated=0;let saltInput=0;let saltOut=0;
   const trajectory=[{week:0,salt,store,shortfall:0,drained:0,irrigated:0,proxy:salt/Math.max(store,15),stress:0}];
   const supply=budget*(s[i]/100); // m3 per week
   for(let w=1;w<=8;w++){
     // Weekly static weather scenario, processed as seven equal days to permit drainage.
     let weekDef=0,weekDrain=0,weekIn=0,weekOut=0;
     for(let day=0;day<7;day++){
       const irrigationMm=(supply*1000/AREA)/7; // m3 -> mm across field
       const effectiveMm=irrigationMm*DAILY_IRRIGATION_EFF;
       const saltAdded=irrigationMm*cfg.ecw*SALT_EC_APPROX/1000; // mm * g/L => g/m² -> kg/m²
       salt+=saltAdded;weekIn+=saltAdded;
       let totalWater=store+effectiveMm;
       const dayDemand=crop.kc*cfg.eto;
       // Simplified availability: water above a residual threshold is available for plant uptake.
       const uptake=Math.min(dayDemand,Math.max(0,totalWater-MIN_ROOT));
       weekDef+=Math.max(0,dayDemand-uptake);totalWater-=uptake;
       const excess=Math.max(0,totalWater-ROOT_CAP);
       if(excess>0){
         // Well-mixed root-zone leaching approximation; drainage-water salinity equals
         // salt mass / representative stored water volume. Conservative cap at remaining salt.
         const frac=clamp(excess/(ROOT_CAP+excess),0,1);
         const removed=salt*frac;
         salt-=removed;weekOut+=removed;weekDrain+=excess;totalWater-=excess;
       }
       store=clamp(totalWater,MIN_ROOT,ROOT_CAP);
     }
     shortfall+=weekDef;drained+=weekDrain;irrigated+=supply;saltInput+=weekIn;saltOut+=weekOut;
     const stress=weekDef/(crop.kc*cfg.eto*7);
     trajectory.push({week:w,salt,store,shortfall:weekDef,drained:weekDrain,irrigated:supply,proxy:salt/Math.max(store,15),stress});
   }
   return {crop,trajectory,shortfall,drained,irrigated,saltInput,saltOut,finalSalt:salt,initialSalt:crop.initialSalt};
 });
 const totalDemand=d.reduce((a,b)=>a+b,0)*8;
 const totalDef=records.reduce((a,r)=>a+r.shortfall*AREA/1000,0);
 const salinityPenalty=records.reduce((a,r)=>a+r.crop.sensitivity*Math.max(0,r.finalSalt-r.initialSalt),0);
 const stressPenalty=records.reduce((a,r)=>a+r.crop.sensitivity*r.shortfall*r.crop.kc,0);
 // Dimensionless weighted penalty: normalized cumulative unmet water and accumulation.
 const stressN=stressPenalty/(8*7*cfg.eto*CROPS.reduce((a,c)=>a+c.sensitivity*c.kc*c.kc,0));
 const saltN=salinityPenalty/(CROPS.length*.5);
 const score=100*(.70*stressN+.30*saltN);
 return {cfg,shares:s.slice(),budget,d,records,totalDemand,totalDef,used:budget*8,score,stressN,saltN};
}
function optimize(cfg){
 // Exhaustive discretized search in 5% increments; all candidates spend the same budget.
 // This avoids random or invented outcomes and makes the optimization reproducible.
 let best=null;
 for(let a=0;a<=100;a+=5){for(let b=0;b<=100-a;b+=5){const c=100-a-b;
   const test=weekModel(cfg,[a,b,c]);
   if(!best||test.score<best.score-1e-10)best=test;
 }}
 return best;
}
function setScenario(key){const settings={normal:[5,.6,5],drought:[40,2.5,5.5],saline:[50,5.2,6.5]};if(!settings[key])return;const [s,e,t]=settings[key];$('shortage').value=s;$('ecw').value=e;$('eto').value=t;update();}
function update(){const cfg=readConfig(),{d,budget}=resources(cfg);$('shortage-value').textContent=cfg.shortage+'%';$('ecw-value').textContent=fmt(cfg.ecw)+' dS/m';$('eto-value').textContent=fmt(cfg.eto)+' mm';$('metric-budget').textContent=fmt(budget,0);$('metric-demand').textContent=fmt(d.reduce((a,b)=>a+b,0),0);$('metric-shortage').textContent=cfg.shortage+'%';$('metric-ec').textContent=fmt(cfg.ecw);
 const s=shares();const sum=s.reduce((a,b)=>a+b,0);$('allocation-total').classList.toggle('bad',!sharesAreValid(s));$('allocation-total').innerHTML='<span>ALLOCATED</span><strong>'+sum+'% of 100%</strong>';
 CROPS.forEach((c,i)=>{$('share-value-'+c.id).textContent=s[i]+'% · '+fmt(budget*s[i]/100,1)+' m³/week';});
 $('input-error').textContent=sharesAreValid(s)?'':'Allocation must total exactly 100%. Adjust the three sliders.';
}
function renderFields(data,week=8){$('field-cards').innerHTML=data.records.map((r,i)=>{
 const t=r.trajectory[week];const stress=t.stress;const risk=stress>.22?'high':stress>.07?'moderate':'low';const riskLabel=risk==='high'?'HIGH WATER STRESS':risk==='moderate'?'MODERATE STRESS':'LOW WATER STRESS';
 return `<article class="field-card"><div class="field-visual ${risk}"><div class="field-top"><span class="field-index">FIELD ${r.crop.id}</span><span class="risk-badge">${riskLabel}</span></div><div class="field-bottom"><strong>${r.crop.name}</strong><span>1,000 m² · model crop Kc ${r.crop.kc}</span></div></div><div class="field-data"><div>SALT INVENTORY<b>${fmt(t.salt,3)} <small>kg/m²</small></b></div><div>WEEKLY WATER GAP<b>${fmt(t.shortfall,1)} <small>mm</small></b></div></div></article>`;
 }).join('');}
function chart(data,week){const width=660,height=240,pad={l:58,r:14,t:14,b:31};const max=Math.max(.2,...data.records.flatMap(r=>r.trajectory.map(p=>p.salt)))*1.13;const x=w=>pad.l+(w/8)*(width-pad.l-pad.r);const y=v=>pad.t+(1-v/max)*(height-pad.t-pad.b);let svg=`<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">`;
 for(let i=0;i<=4;i++){let val=max*i/4,yy=y(val);svg+=`<line x1="${pad.l}" y1="${yy}" x2="${width-pad.r}" y2="${yy}" stroke="#294148" stroke-dasharray="3 5"/><text x="${pad.l-10}" y="${yy+4}" text-anchor="end" font-size="11" fill="#84a19e">${fmt(val,2)}</text>`;}
 for(let w=0;w<=8;w++){svg+=`<text x="${x(w)}" y="${height-5}" text-anchor="middle" font-size="10" fill="#84a19e">${w}</text>`;}
 svg+=`<line x1="${x(week)}" y1="${pad.t}" x2="${x(week)}" y2="${height-pad.b}" stroke="#bad9ce" stroke-dasharray="4 5" opacity=".65"/>`;
 data.records.forEach(r=>{const coords=r.trajectory.map(p=>`${x(p.week)},${y(p.salt)}`).join(' ');svg+=`<polyline points="${coords}" fill="none" stroke="${r.crop.color}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>`;const point=r.trajectory[week];svg+=`<circle cx="${x(week)}" cy="${y(point.salt)}" r="4.3" fill="${r.crop.color}" stroke="#071318" stroke-width="2"/>`;});svg+='</svg>';$('salt-chart').innerHTML=svg;}
function renderWeek(data){const week=+$('week').value;$('week-label').textContent='Week '+week;$('insight-week').textContent=week;renderFields(data,week);chart(data,week);$('week-conditions').innerHTML=data.records.map(r=>{const t=r.trajectory[week];return `<div class="insight-row"><div class="first">${r.crop.name}<span>${fmt(t.salt,3)} kg/m²</span></div><div class="second">Salt stored in modeled root zone · weekly deficit ${fmt(t.shortfall,1)} mm</div></div>`;}).join('');}
function summaryCards(data,target){$(target).innerHTML=`<div>8-week water use<strong>${fmt(data.used,0)} m³</strong></div><div>Unmet crop demand<strong>${fmt(data.totalDef,0)} m³</strong></div><div>Salt risk component<strong>${fmt(data.saltN,2)}</strong></div><div>Water stress component<strong>${fmt(data.stressN,2)}</strong></div>`;}
function comparison(){if(!current||!optimized)return;$('human-score').textContent=fmt(current.score);$('ai-score').textContent=fmt(optimized.score);summaryCards(current,'human-stats');summaryCards(optimized,'ai-stats');const diff=current.score-optimized.score;const changed=CROPS.map((c,i)=>`${c.name}: ${optimized.shares[i]}%`).join(', ');if(diff<.01){$('conclusion-title').textContent='You matched the optimizer';$('conclusion-text').textContent=`Your allocation performs as well as the best 5%-increment allocation in this model. Optimizer allocation: ${changed}.`;}else{$('conclusion-title').textContent='A different allocation reduces modeled penalty';$('conclusion-text').textContent=`The search lowers the weighted penalty by ${fmt(diff,1)} points under the same water supply. Suggested allocation: ${changed}. This does not establish real-world superiority.`;}}
function run(opt=false){const cfg=readConfig(),s=shares();if(!sharesAreValid(s)){$('input-error').textContent='Please make the three allocation sliders add up to exactly 100%.';$('laboratory').scrollIntoView({behavior:'smooth'});return;}lastHumanShares=s;current=weekModel(cfg,s);optimized=optimize(cfg);$('result-badge').textContent=opt?'OPTIMIZER COMPARISON':'PLAYER SIMULATION';$('week').value=8;renderWeek(current);comparison();(opt?$('compare'):$('results')).scrollIntoView({behavior:'smooth'});}
function downloadCsv(){if(!current)return;const lines=['strategy,field,week,salt_kg_m2,water_storage_mm,water_deficit_mm,drainage_mm,irrigation_m3'];for(const [name,data] of [['player',current],['optimizer',optimized]]){data.records.forEach(r=>r.trajectory.forEach(t=>lines.push(`${name},${r.crop.name},${t.week},${t.salt},${t.store},${t.shortfall},${t.drained},${t.irrigated}`)));}const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='saltscape_eight_week_results.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function init(){ $('allocation-controls').innerHTML=CROPS.map((c,i)=>`<div class="allocation-row"><div class="crop-name"><span>${c.icon} &nbsp;${c.name}</span><strong id="share-value-${c.id}">—</strong></div><div class="crop-sub">Field ${c.id} · salinity sensitivity weight ${c.sensitivity}</div><input aria-label="${c.name} water share" type="range" id="share-${c.id}" min="0" max="100" step="5" value="${lastHumanShares[i]}"></div>`).join('');
 for(const id of ['shortage','ecw','eto'])$(id).addEventListener('input',()=>{$('preset').value='custom';update();});
 CROPS.forEach(c=>$('share-'+c.id).addEventListener('input',update));$('preset').addEventListener('change',e=>setScenario(e.target.value));$('simulate').addEventListener('click',()=>run(false));$('optimize').addEventListener('click',()=>run(true));$('recalculate').addEventListener('click',()=>run(true));$('week').addEventListener('input',()=>renderWeek(current));$('download').addEventListener('click',downloadCsv);
 document.querySelectorAll('.nav').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));el.classList.add('active');}));
 update();current=weekModel(readConfig(),lastHumanShares);optimized=optimize(readConfig());renderWeek(current);comparison();
}
init();
