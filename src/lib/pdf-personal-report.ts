import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import { isoWeekInfo, isoWeekLabel } from "@/lib/week-labels.mjs";
import type { exportPersonalData } from "@/lib/export-personal-data";

type Data = Awaited<ReturnType<typeof exportPersonalData>>;
type Color = ReturnType<typeof rgb>;
type Goal = Data["goals"][number];
type Action = Goal["actions"][number];
type Reflection = Data["reflections"][number];
type Meeting = Data["meetings"][number];

const W = 595.28, H = 841.89, M = 42, CW = W - M * 2;
// Palet 3 - Rust & Groei; match the app's approved visual guidelines.
const dark = rgb(35/255,61/255,52/255), green = rgb(31/255,93/255,80/255);
const grey = rgb(83/255,107/255,96/255), sage = rgb(123/255,168/255,146/255);
const cream = rgb(250/255,246/255,238/255), white = rgb(1,253/255,250/255);
const line = rgb(216/255,226/255,215/255), mint = rgb(216/255,226/255,215/255);
const lime = rgb(234/255,240/255,233/255), peach = rgb(252/255,232/255,216/255);
const lilac = rgb(240/255,234/255,249/255);
const pink = rgb(252/255,234/255,229/255), blue = rgb(234/255,241/255,253/255);
const variants = [
  { fill:lime, ink:green }, { fill:peach, ink:dark },
  { fill:blue, ink:green }, { fill:lilac, ink:dark },
  { fill:pink, ink:green }, { fill:mint, ink:dark },
];

function safe(value: unknown) {
  return String(value ?? "").replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-").replace(/\u2026/g, "...")
    .replace(/[\u00A0\u202F]/g, " ")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e\xA0-\xFF\n]/g, "?");
}
function lines(value: unknown, font: PDFFont, size: number, width: number) {
  const output: string[] = [];
  for (const paragraph of safe(value).split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      const next = current ? current + " " + word : word;
      if (font.widthOfTextAtSize(next,size) <= width) { current = next; continue; }
      if (current) output.push(current);
      current = "";
      for (const letter of word) {
        if (current && font.widthOfTextAtSize(current+letter,size)>width) {
          output.push(current);current="";
        }
        current+=letter;
      }
    }
    output.push(current);
  }
  return output;
}
const asDate = (value: string | Date) => typeof value === "string"
  ? new Date(value.slice(0,10)+"T00:00:00Z") : value;
const dateText = (date: string | Date) => new Intl.DateTimeFormat("nl-NL", {
  timeZone:"UTC",day:"numeric",month:"long",year:"numeric",
}).format(asDate(date));

function recorded(week: { completedCount: number; note: string | null; entries: unknown[] }) {
  return week.completedCount>0 || !!week.note?.trim() || week.entries.length>0;
}

export async function createPersonalPdf(data: Data, name: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle("Mijn Leefstijl | Persoonlijk overzicht");
  document.setAuthor("Mijn Leefstijl");
  document.setSubject("Persoonlijk leefstijloverzicht");
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  // Reuse the exact vector mountain/climber mark from the approved app branch.
  // sharp is already installed for private meeting-photo processing.
  const markSvg = await readFile(join(process.cwd(), "public/brand/mark-user-v6.svg"));
  const markPng = await sharp(markSvg).resize({width: 320}).png().toBuffer();
  const mark = await document.embedPng(markPng);
  let page!: PDFPage, y = 0;
  const text = (value: unknown, x: number, top: number, size=10, font=regular, ink:Color=dark) => {
    page.drawText(safe(value), {x,y:H-top,size,font,color:ink});
  };
  const box = (x:number, top:number,w:number,h:number,fill:Color,r=0) => {
    const radius=Math.max(0,Math.min(r,w/2,h/2));
    if(!radius) {
      page.drawRectangle({x,y:H-top-h,width:w,height:h,color:fill});return;
    }
    page.drawRectangle({x:x+radius,y:H-top-h,width:w-2*radius,height:h,color:fill});
    page.drawRectangle({x,y:H-top-h+radius,width:w,height:h-2*radius,color:fill});
    for(const xx of [x+radius,x+w-radius]) for(const yy of [top+radius,top+h-radius]) {
      page.drawCircle({x:xx,y:H-yy,size:radius,color:fill});
    }
  };
  const circle = (x:number,top:number,r:number,fill:Color) =>
    page.drawCircle({x,y:H-top,size:r,color:fill});
  const stroke = (x:number,top:number,x2:number,top2:number,ink:Color=line,width=1) =>
    page.drawLine({start:{x,y:H-top},end:{x:x2,y:H-top2},thickness:width,color:ink});
  const bar = (x:number,top:number,w:number,pct:number,ink:Color=green,h=6) => {
    box(x,top,w,h,line,h/2);
    if(pct>0)box(x,top,Math.min(w,Math.max(h,w*pct/100)),h,ink,h/2);
  };
  const textLines = (content: unknown, x:number, top:number, width:number, size=10,
    font=regular, ink:Color=dark, lineH=size+4) => {
    const ls=lines(content,font,size,width);
    ls.forEach((s,i)=>{if(s)text(s,x,top+i*lineH,size,font,ink);});
    return ls.length*lineH;
  };
  const pageFrame=()=>{
    page=document.addPage([W,H]);
    box(0,0,W,H,cream);
    // The branding is part of the page, but the small climber never obscures content.
    circle(W+24,7,56,lime);circle(W+15,3,17,peach);
    page.drawImage(mark,{x:M,y:H-39-29,width:36.4,height:29});
    text("MIJN LEEFSTIJL",M+44,57,10.7,bold,green);
    const reportDate=new Intl.DateTimeFormat("nl-NL", {
      timeZone:"Europe/Amsterdam",day:"numeric",month:"long",year:"numeric",
    }).format(new Date());
    text(reportDate,W-M-regular.widthOfTextAtSize(safe(reportDate),9),78,9,regular,grey);
    y=105;
  };
  let continuationGoal: string | null = null;
  const next=()=>{
    pageFrame();
    if (continuationGoal) {
      text("Leefstijlplan (vervolg)",M,120,21,bold,dark);
      textLines(continuationGoal,M,145,CW-16,10,regular,grey,14);
      y=145+lines(continuationGoal,regular,10,CW-16).length*14+13;
    }
  };
  const ensure=(h:number)=>{
    if(y+h>H-74)next();
  };
  const section=(caption:string)=>{
    ensure(47);
    text(caption.toUpperCase(),M,y+8,10.5,bold,green);
    y+=29;
  };
  const donut=(cx:number,cy:number,r:number,pct:number)=>{
    const steps=84;
    for(let i=0;i<steps;i++){
      const a=(-Math.PI/2)+(2*Math.PI*i/steps);
      circle(cx+Math.cos(a)*r,cy+Math.sin(a)*r,3.7,
        i<Math.round(steps*Math.max(0,Math.min(100,pct))/100)?green:white);
    }
    const pctText=pct+"%";
    const size=21;
    text(pctText,cx-bold.widthOfTextAtSize(pctText,size)/2,cy+5,size,bold,dark);
    const label="deze week";
    text(label,cx-regular.widthOfTextAtSize(label,7.7)/2,cy+20,7.7,regular,grey);
  };
  const labelPill=(label:string,x:number,top:number,ink:Color,width=82)=>{
    box(x,top,width,20,white,10);
    const size=8;
    text(label,x+width/2-bold.widthOfTextAtSize(safe(label),size)/2,top+13,size,bold,ink);
  };
  const weekStart=amsterdamMonday();
  const thisWeek=weekStart.toISOString().slice(0,10);
  const active=data.goals.filter(g=>g.status==="ACTIVE");
  const goalActions=(goal:Goal)=>goal.actions.filter(a=>!a.archivedAt);
  const progressFor=(a:Action)=>{
    const snapshot=a.weeks.find(w=>w.weekStart===thisWeek);
    return {done:snapshot?.completedCount??0,target:snapshot?.targetCount??a.targetPerWeek};
  };
  const all=active.flatMap(goalActions);
  const total=all.reduce((n,a)=>n+progressFor(a).target,0);
  const done=all.reduce((n,a)=>n+progressFor(a).done,0);
  const overall=total>0?Math.round(100*done/total):0;
  pageFrame();
  text("Jouw leefstijl",M,121,29,bold,dark);
  text(`${active.length} ${active.length===1?"doel":"doelen"}, ${all.length} ${all.length===1?"actie":"acties"}`,M,145,11,regular,grey);
  box(M,157,CW,123,lime,20);
  // Warm accent sun and the actual climber/peaks motif - no improvised figure.
  circle(W-248,179,15,peach);
  page.drawImage(mark,{x:W-259,y:H-180-86,width:108,height:86});
  labelPill(isoWeekLabel(thisWeek).replace("Week ","WEEK ").split(" · ")[0],M+20,175,green,81);
  text(`${done} van ${total}`,M+20,219,25,bold,dark);
  text("keer uitgevoerd",M+20,239,11,regular,grey);
  text(String(isoWeekInfo(thisWeek).year),M+20,263,9,regular,grey);
  donut(W-101,221,37,overall);
  y=300;

  const createTextRows=(value:string,font=regular,size=10,width=CW-36) =>
    value.trim()?lines(value,font,size,width).map(v=>({value:v,font,size,ink:dark,leading:14})):[];

  // A summary-only page first; no guided answers are mixed into the overview.
  // Large overviews can continue on another overview page, never inside a plan.
  const goalSummaryCard=(goal:Goal,gi:number,actions:Action[])=>{
    const palette=variants[gi%variants.length];
    const chunks:Action[][]=[];
    if(!actions.length)chunks.push([]);
    else for(let i=0;i<actions.length;i+=4)chunks.push(actions.slice(i,i+4));
    for(let ci=0;ci<chunks.length;ci++){
      const group=chunks[ci];
      const badge=goal.area.toUpperCase();
      const badgeWidth=Math.max(77,Math.min(112,bold.widthOfTextAtSize(safe(badge),8)+22));
      const nameLines=lines(goal.title,bold,15,CW-85-badgeWidth);
      const header=Math.max(24,nameLines.length*18);
      const rowInfo=group.map(a=>{
        const titleLines=lines(a.title,regular,10,CW-145);
        return {action:a,titleLines,height:titleLines.length*12+11};
      });
      const rowsHeight=rowInfo.reduce((n,r)=>n+r.height,0);
      const height=13+header+7+rowsHeight+30;
      ensure(height+12);
      const top=y;
      box(M,top,CW,height,palette.fill,18);
      circle(M+25,top+28,13,white);
      text(String(gi+1),M+25-bold.widthOfTextAtSize(String(gi+1),10)/2,top+32,10,bold,palette.ink);
      nameLines.forEach((line,i)=>text(line,M+45,top+30+i*18,15,bold,dark));
      labelPill(badge,W-M-badgeWidth-16,top+16,palette.ink,badgeWidth);
      if(ci>0)text("vervolg",M+45,top+30+header,8.5,regular,grey);
      let rowTop=top+13+header+7;
      for(const item of rowInfo){
        const p=progressFor(item.action);
        item.titleLines.forEach((line,i)=>{if(line)text(line,M+19,rowTop+7+i*12,10,regular,dark);});
        const score=`${p.done} / ${p.target}`;
        text(score,W-M-20-bold.widthOfTextAtSize(score,10),rowTop+7,10,bold,palette.ink);
        bar(M+19,rowTop+item.titleLines.length*12+1,CW-38,
          p.target?100*p.done/p.target:0,palette.ink,4.4);
        rowTop+=item.height;
      }
      stroke(M+19,top+height-25,W-M-19,top+height-25,line,.7);
      const gp=actions.reduce((acc,a)=>({done:acc.done+progressFor(a).done,target:acc.target+progressFor(a).target}),{done:0,target:0});
      text(isoWeekLabel(thisWeek),M+19,top+height-10,8.5,regular,grey);
      const summary=gp.target?`${gp.done} / ${gp.target}  (${Math.round(100*gp.done/gp.target)}%)`:"Nog geen weekacties";
      text(summary,W-M-20-bold.widthOfTextAtSize(summary,9),top+height-10,9,bold,palette.ink);
      y+=height+11;
    }

  };

  section("Mijn doelen en acties");
  if(!active.length){
    box(M,y,CW,55,lime,16);
    text("Nog geen actieve doelen.",M+16,y+31,11,regular,grey);
    y+=70;
  }
  for(let gi=0;gi<active.length;gi++){
    goalSummaryCard(active[gi],gi,goalActions(active[gi]));
  }
  if(active.length && y+28<H-74){
    text("De volledige plannen staan op de volgende pagina's.",M,y+15,9,regular,grey);
  }

  // Each individual goal begins on its own page; a long plan continues only
  // with that same goal and never shares a page with another goal.
  for(let gi=0;gi<active.length;gi++){
    const goal=active[gi],actions=goalActions(goal);
    const palette=variants[gi%variants.length];
    continuationGoal=null;
    next();
    text("Mijn leefstijlplan",M,120,25,bold,dark);
    text(`DOEL ${gi+1} VAN ${active.length}`,M,146,10,bold,green);
    y=168;
    continuationGoal=`Doel ${gi+1}: ${goal.title}`;
    goalSummaryCard(goal,gi,actions);

    // The JSON export already includes these guided goal/action answers. Keep
    // the same information in the shareable PDF, directly below each goal.
    // Only completed answers are rendered; long text uses paginated cards.
    const goalAnswers=[
      {caption:"Waarom is dit doel belangrijk?",value:goal.motivation??""},
      {caption:"Hoe merk ik dat ik mijn doel bereik?",value:goal.progressIndicator??""},
    ];
    if(goalAnswers.some(field=>field.value.trim())) {
      narrativeCard("Mijn doel: "+goal.title,goalAnswers,palette.fill,palette.ink);
    }
    for(const action of actions){
      const actionAnswers=[
        {caption:"Wanneer ga ik dit doen?",value:action.whenContext??""},
        {caption:"Haalbaarheid (1-10)",value:action.confidenceScore == null?"":`${action.confidenceScore} / 10`},
        {caption:"Wat helpt mij nu al?",value:action.existingStrength??""},
        {caption:"Wat zou mijn haalbaarheid verhogen?",value:action.confidenceBooster??""},
        {caption:"Wat kan mij tegenhouden?",value:action.obstacle??""},
        {caption:"Plan B als het niet lukt",value:action.fallbackPlan??""},
      ];
      if(actionAnswers.some(field=>field.value.trim())) {
        narrativeCard("Mijn actie: "+action.title,actionAnswers,palette.fill,palette.ink);
      }
    }
  }
  continuationGoal=null;

  // Only real recorded weeks enter the shareable report; no empty placeholders.
  const weekly: {week:string;done:number;target:number;percentage:number}[]=[];
  for(let i=0;i<12;i++){
    const monday=new Date(weekStart);monday.setUTCDate(monday.getUTCDate()-i*7);
    const week=monday.toISOString().slice(0,10);
    const snapshots=data.goals.flatMap(g=>g.actions.flatMap(a=>a.weeks.filter(w=>w.weekStart===week && recorded(w))));
    const target=snapshots.reduce((sum,w)=>sum+w.targetCount,0);
    if(!target)continue;
    const completed=snapshots.reduce((sum,w)=>sum+w.completedCount,0);
    weekly.push({week,done:completed,target,percentage:Math.round(100*completed/target)});
  }
  const reflections=[...data.reflections].sort((a,b)=>b.weekStart.localeCompare(a.weekStart)).slice(0,12);
  const meetings=[...data.meetings].sort((a,b)=>b.meetingDate.localeCompare(a.meetingDate)).slice(0,24);

  if(weekly.length||reflections.length||meetings.length){
    next();
    text("Terugblik & reflectie",M,115,26,bold,dark);
    y=143;
  }
  if(weekly.length){
    section("Voortgang");
    const maxPerPanel=8;
    for(let start=0;start<weekly.length;start+=maxPerPanel){
      const rows=weekly.slice(start,start+maxPerPanel);
      const height=39+rows.length*28+15;
      ensure(height+10);
      box(M,y,CW,height,lime,19);
      text("GEREGISTREERDE WEKEN",M+19,y+23,9,bold,green);
      rows.forEach((row,i)=>{
        const top=y+44+i*28;
        const label=isoWeekLabel(row.week).replace("Week ","W");
        text(label,M+20,top,9.2,bold,dark);
        bar(M+138,top-10,CW-226,row.percentage,sage,7);
        const pct=row.percentage+"%";
        text(pct,W-M-20-bold.widthOfTextAtSize(pct,9),top,9,bold,green);
      });
      y+=height+12;
    }
  }

  // Long user-written text is split into continuation cards when required.
  function narrativeCard(title:string,fields:{caption:string;value:string}[],fill:Color,accent:Color) {
    const segments:{value:string;font:PDFFont;size:number;ink:Color;leading:number}[]=[];
    for(const field of fields){
      if(!field.value.trim())continue;
      if(segments.length)segments.push({value:"",font:regular,size:5,ink:grey,leading:8});
      segments.push({value:field.caption.toUpperCase(),font:bold,size:9,ink:accent,leading:19});
      segments.push(...createTextRows(field.value));
    }
    if(!segments.length) {
      // Meeting with private photos but no transcribed notes remains visible.
      ensure(69);
      box(M,y,CW,62,fill,17);
      textLines(title,M+17,y+30,CW-34,12,bold,dark,17);
      y+=74;
      return;
    }
    let cursor=0,part=0;
    while(cursor<segments.length){
      const suffix=part?" (vervolg)":"";
      const titleLines=lines(title+suffix,bold,12,CW-130);
      const header=42+titleLines.length*17;
      if(y>H-190)next();
      const space=H-73-y;
      const limit=Math.max(80,Math.min(410,space-header-22));
      let sliceHeight=0,amount=0;
      while(cursor+amount<segments.length &&
        sliceHeight+segments[cursor+amount].leading<=limit){
        sliceHeight+=segments[cursor+amount].leading;amount++;
      }
      if(!amount){next();continue;}
      const height=header+sliceHeight+15;
      ensure(height+11);
      box(M,y,CW,height,fill,18);
      const headingLines=titleLines;
      headingLines.forEach((l,i)=>text(l,M+18,y+27+i*17,12,bold,dark));
      let top=y+header;
      for(const row of segments.slice(cursor,cursor+amount)){
        if(row.value)text(row.value,M+19,top,row.size,row.font,row.ink);
        top+=row.leading;
      }
      y+=height+11;cursor+=amount;part++;
    }
  }

  if(reflections.length){
    section("Mijn weekreflecties");
    for(let i=0;i<reflections.length;i++){
      const r=reflections[i],v=variants[(i+2)%variants.length];
      narrativeCard(isoWeekLabel(r.weekStart),[
        {caption:"Wat ging goed?",value:r.wentWell},
        {caption:"Wat was lastig?",value:r.difficult},
        {caption:"Volgende stap",value:r.nextStep},
      ],v.fill,v.ink);
    }
  }
  if(meetings.length){
    section("CooL-bijeenkomsten");
    for(let i=0;i<meetings.length;i++){
      const meeting=meetings[i],v=variants[(i+1)%variants.length];
      narrativeCard(meeting.title,[
        {caption:"Datum",value:dateText(meeting.meetingDate)},
        {caption:"Aantekeningen",value:meeting.notes},
        {caption:"Actiepunten",value:meeting.actionPoints??""},
      ],v.fill,v.ink);
      // Photo files are deliberately omitted from the shareable PDF.
    }
  }
  document.getPages().forEach((p,index)=>{
    p.drawLine({start:{x:M,y:48},end:{x:W-M,y:48},color:line,thickness:.8});
    p.drawText("MIJN LEEFSTIJL",{x:M,y:31,size:8,font:bold,color:green});
    const number=`${index+1} / ${document.getPageCount()}`;
    p.drawText(number,{x:W-M-bold.widthOfTextAtSize(number,8),y:31,size:8,font:bold,color:grey});
  });
  return document.save();
}
