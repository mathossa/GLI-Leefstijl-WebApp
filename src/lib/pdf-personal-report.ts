import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { amsterdamMonday } from "@/lib/goals-domain.mjs";
import type { exportPersonalData } from "@/lib/export-personal-data";

type PersonalData = Awaited<ReturnType<typeof exportPersonalData>>;
const WIDTH = 595.28, HEIGHT = 841.89;
const M = 47, BODY = WIDTH - M * 2;
const navy = rgb(0.14, 0.30, 0.22);
const green = rgb(0.22, 0.46, 0.33);
const soft = rgb(0.91, 0.95, 0.90);
const white = rgb(1, 1, 1);
const textColor = rgb(0.23, 0.31, 0.25);
const muted = rgb(0.42, 0.50, 0.44);
const ivory = rgb(0.98, 0.98, 0.96);
const line = rgb(0.85, 0.89, 0.85);

// Built-in PDF fonts support WinAnsi, so replace unsupported symbols safely.
function safe(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-").replace(/\u2022/g, "-")
    .replace(/\u2026/g, "...").replace(/\u00A0/g, " ")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e\xA0-\xFF\n]/g, "?");
}
const fmt = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value.slice(0, 10) + "T00:00:00Z") : value;
  return new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(date);
};
function wrap(value: string, font: PDFFont, size: number, max: number) {
  const lines: string[] = [];
  for (const paragraph of safe(value).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= max) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = "";
        // Break abnormally long words without widening the page.
        for (const ch of word) {
          if (font.widthOfTextAtSize(line + ch, size) > max && line) { lines.push(line); line = ""; }
          line += ch;
        }
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function createPersonalPdf(data: PersonalData, name: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Mijn Leefstijl - persoonlijk overzicht");
  pdf.setAuthor("Mijn Leefstijl");
  pdf.setSubject("Persoonlijk overzicht van zelf vastgelegde doelen, ervaringen en reflecties");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage;
  let y = 0;
  function newPage() {
    page = pdf.addPage([WIDTH, HEIGHT]);
    page.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: ivory });
    page.drawRectangle({ x: 0, y: HEIGHT - 15, width: WIDTH, height: 15, color: green });
    page.drawText("MIJN LEEFSTIJL", { x: M, y: HEIGHT - 48, size: 10.5, font: bold, color: green });
    page.drawLine({ start: {x:M,y:HEIGHT-64}, end:{x:WIDTH-M,y:HEIGHT-64}, color:line, thickness:0.8 });
    y = HEIGHT - 89;
  }
  function need(h: number) { if (y - h < 65) newPage(); }
  function lineText(value: string, size = 10, font = regular, color = textColor, x=M) {
    need(size + 7);
    page.drawText(safe(value), { x, y, size, font, color });
    y -= size + 8;
  }
  function paragraph(value: string, opts: {size?:number; font?:PDFFont; color?:typeof textColor; indent?:number} = {}) {
    if (!value?.trim()) return;
    const size = opts.size ?? 10;
    const font = opts.font ?? regular;
    const indent = opts.indent ?? 0;
    const lines = wrap(value, font, size, BODY - indent);
    for (const item of lines) {
      need(size + 4);
      page.drawText(item || " ", {x:M+indent,y,size,font,color:opts.color ?? textColor});
      y -= size + 5;
    }
    y -= 5;
  }
  function heading(value: string) {
    need(48);
    y -= 13;
    page.drawRectangle({x:M,y:y-8,width:4,height:22,color:green});
    page.drawText(safe(value),{x:M+15,y:y-3,size:17,font:bold,color:navy});
    y -= 34;
  }
  function rowTitle(value: string, sub?:string) {
    need(37);
    y -= 4;
    const lines=wrap(value,bold,11,BODY);
    for(const line of lines){need(17);page.drawText(line,{x:M,y,size:11,font:bold,color:navy});y-=17;}
    if(sub)paragraph(sub,{size:9,color:muted});
    else y-=3;
  }
  function divider(){need(9);page.drawLine({start:{x:M,y},end:{x:WIDTH-M,y},color:line,thickness:0.6});y-=13;}
  function labelText(title:string,value:string){
    if(!value?.trim())return;
    paragraph(title,{size:9,font:bold,color:green});
    paragraph(value,{size:10,indent:9});
  }
  function miniStats(items:{label:string;value:string}[]) {
    need(85);
    const gap=10,w=(BODY-(items.length-1)*gap)/items.length;
    items.forEach((it,i)=>{
      const x=M+i*(w+gap);
      page.drawRectangle({x,y:y-68,width:w,height:76,color:soft});
      page.drawText(safe(it.value),{x:x+12,y:y-28,size:21,font:bold,color:navy});
      const ls=wrap(it.label,regular,8,w-24);
      ls.slice(0,2).forEach((l,k)=>page.drawText(l,{x:x+12,y:y-44-k*10,size:8,font:regular,color:muted}));
    });
    y-=91;
  }
  newPage();
  need(160);
  page.drawRectangle({x:M,y:y-125,width:BODY,height:137,color:soft});
  page.drawText("PERSOONLIJK OVERZICHT",{x:M+19,y:y-25,size:10,font:bold,color:green});
  page.drawText("Mijn Leefstijl",{x:M+19,y:y-63,size:27,font:bold,color:navy});
  const nameLines=wrap(name||"Persoonlijk verslag",regular,11,BODY-38);
  page.drawText(nameLines[0]||"Persoonlijk verslag",{x:M+19,y:y-88,size:11,font:regular,color:textColor});
  page.drawText(fmt(new Date()),{x:M+19,y:y-108,size:9,font:regular,color:muted});
  y-=158;
  const active=data.goals.filter(g=>g.status==="ACTIVE");
  const countActions=active.reduce((acc,g)=>acc+g.actions.filter(a=>!a.archivedAt).length,0);
  miniStats([
    {label:"Actieve doelen",value:String(active.length)},
    {label:"Weekacties",value:String(countActions)},
    {label:"Reflecties",value:String(data.reflections.length)},
    {label:"CooL-bijeenkomsten",value:String(data.meetings.length)},
  ]);
  paragraph("Dit verslag is gebaseerd op je eigen ingevoerde gegevens. Het is geen medische beoordeling.",{size:9,color:muted});

  heading("Mijn doelen");
  if(!active.length)paragraph("Nog geen actieve doelen geregistreerd.");
  for (const goal of active) {
    rowTitle(goal.title, [goal.area.toLowerCase(),goal.motivation].filter(Boolean).join(" - "));
    for(const a of goal.actions.filter(a=>!a.archivedAt)){
      const weekStart=amsterdamMonday().toISOString().slice(0,10);
      const snap=a.weeks.find(w=>w.weekStart===weekStart);
      const completed=snap?.completedCount??0, target=snap?.targetCount??a.targetPerWeek;
      need(42);
      page.drawRectangle({x:M+9,y:y-23,width:BODY-18,height:32,color:white});
      const text=wrap(a.title,regular,9.5,BODY-125)[0]||"Actie";
      page.drawText(text,{x:M+18,y:y-10,size:9.5,font:regular,color:textColor});
      page.drawText(`${completed} / ${target}`,{x:WIDTH-M-55,y:y-10,size:9.5,font:bold,color:green});
      y-=36;
    }
    divider();
  }

  heading("Voortgang per week");
  paragraph("Laatste twaalf weken. Niet ingevuld wordt als 'Geen gegevens' weergegeven.",{size:9,color:muted});
  const monday=amsterdamMonday();
  for(let i=0;i<12;i++){
    const start=new Date(monday);
    start.setUTCDate(start.getUTCDate()-7*i);
    const key=start.toISOString().slice(0,10);
    const snapshots=data.goals.flatMap(g=>g.actions.flatMap(a=>a.weeks.filter(w=>w.weekStart===key &&
      (w.completedCount>0 || !!w.note || w.entries.length>0))));
    const target=snapshots.reduce((v,w)=>v+w.targetCount,0);
    const done=snapshots.reduce((v,w)=>v+w.completedCount,0);
    const pct=target?Math.round(done/target*100):null;
    need(22);
    page.drawText("Week " + fmt(key),{x:M,y,size:9,font:regular,color:textColor});
    page.drawText(pct===null?"Geen gegevens":`${done}/${target}  (${pct}%)`,{
      x:WIDTH-M-110,y,size:9,font:bold,color:green});
    y-=22;
  }

  heading("Mijn weekreflecties");
  const recent=[...data.reflections].sort((a,b)=>b.weekStart.localeCompare(a.weekStart)).slice(0,12);
  if(!recent.length)paragraph("Nog geen weekreflecties.");
  for(const r of recent){
    rowTitle("Week van " + fmt(r.weekStart));
    labelText("WAT GING GOED?",r.wentWell);
    labelText("WAT WAS LASTIG?",r.difficult);
    labelText("VOLGENDE STAP",r.nextStep);
    divider();
  }

  heading("CooL-bijeenkomsten");
  const meetings=[...data.meetings].sort((a,b)=>b.meetingDate.localeCompare(a.meetingDate)).slice(0,24);
  if(!meetings.length)paragraph("Nog geen bijeenkomstnotities.");
  for(const m of meetings){
    rowTitle(m.title,fmt(m.meetingDate));
    labelText("AANTEKENINGEN",m.notes);
    labelText("ACTIEPUNTEN",m.actionPoints??"");
    if(m.photos?.length)paragraph(`${m.photos.length} privefoto('s) opgeslagen; foto's zijn niet opgenomen in dit deelbare verslag.`,{size:9,color:muted});
    divider();
  }
  heading("Over dit verslag");
  paragraph("De PDF is bedoeld om te delen. Hij bevat je actieve doelen, de laatste 12 weken voortgang, maximaal 12 recente reflecties en 24 recente CooL-bijeenkomsten. Privéfoto's zijn bewust niet bijgevoegd.",{size:9,color:muted});
  paragraph("Download de JSON-export vanuit Mijn Leefstijl voor de volledige machineleesbare historie en individuele actie-ervaringen.",{size:9,color:muted});

  pdf.getPages().forEach((p,index)=>{
    p.drawLine({start:{x:M,y:46},end:{x:WIDTH-M,y:46},color:line,thickness:0.7});
    p.drawText("Mijn Leefstijl  |  Persoonlijk en vertrouwelijk",{x:M,y:30,size:8,font:regular,color:muted});
    p.drawText(`${index+1} / ${pdf.getPageCount()}`,{x:WIDTH-M-33,y:30,size:8,font:regular,color:muted});
  });
  return pdf.save();
}
