import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_QUOTE_FILE_BYTES, normalizedQuote, validateQuote, parseQuoteFile, planQuoteImport,
  exportQuotesCsv,
} from "../src/lib/admin-quote-domain.mjs";

test("quote validation normalizes whitespace, case, category and rejects dangerous input", () => {
  const result = validateQuote({ text: "  Een   wandeling \r\n telt  ", category: " Bewegen ", isActive: true });
  assert.equal(result.text, "Een wandeling telt");
  assert.equal(result.normalizedText, "een wandeling telt");
  assert.equal(result.category, "BEWEGEN");
  assert.equal(normalizedQuote("  RUST\t IS   goed "), "rust is goed");
  assert.throws(() => validateQuote({ text: "  " }), /Tekst/);
  assert.throws(() => validateQuote({ text: "x".repeat(301) }), /Tekst/);
  assert.throws(() => validateQuote({ text: "Geldig", category: "<script>" }), /Categorie/);
  assert.throws(() => validateQuote({ text: "Geldig", isActive: "maybe" }), /Actief/);
  assert.throws(() => validateQuote({ text: "Geldig", id: "../../etc/passwd" }), /ID/);
});

test("JSON imports support export format and signal invalid/duplicate entries", () => {
  const entries = parseQuoteFile(JSON.stringify({version:1,quotes:[
    {id:"starter-001",text:"Iets anders",isActive:false,category:"SLAAP"},
    {text:"  iets   ANDERS "},
    {text:""},
  ]}),"json");
  assert.equal(entries.length,3);
  const plan=planQuoteImport(entries,[{id:"starter-001",text:"Oud",normalizedText:"oud",category:null,isActive:true,deletedAt:null}]);
  assert.deepEqual(plan.map(x=>x.operation),["update","error","error"]);
  assert.match(plan[1].reason,/Dubbele/);
  assert.throws(() => parseQuoteFile("bad","json"), /JSON/);
  assert.throws(() => parseQuoteFile(JSON.stringify({other:[]}),"json"), /quotes-array/);
});

test("CSV supports BOM, quoted commas, escaped quotes and Windows newlines", () => {
  const csv='\uFEFF"id","text","category","isActive"\r\n' +
    '"","Rust, ook als je \"\"druk\"\" bent","SLAAP","true"\r\n' +
    '"","Verandering begint op dinsdag","","false"\r\n';
  const lines=parseQuoteFile(csv,"csv");
  assert.equal(lines.length,2);
  assert.equal(lines[0].text,'Rust, ook als je "druk" bent');
  assert.equal(lines[1].isActive,false);
  assert.throws(() => parseQuoteFile('text\n"niet afgesloten',"csv"), /aanhalingstekens/);
  assert.throws(() => parseQuoteFile('wrong\nquote',"csv"), /text/);
});

test("preview distinguishes create/update/unchanged and soft-deleted duplicates", () => {
  const existing=[
    {id:"starter-001",text:"Rust nemen",normalizedText:"rust nemen",category:null,isActive:true,deletedAt:null},
    {id:"removed-01",text:"Verwijderd",normalizedText:"verwijderd",category:null,isActive:false,deletedAt:new Date()},
  ];
  const entries=parseQuoteFile(JSON.stringify([
    {id:"starter-001",text:"Rust nemen",isActive:true},
    {id:"starter-001-b",text:"Heel nieuw"},
    {text:"rust  NEMEN"},
    {id:"removed-01",text:"Verwijderd"},
  ]),"json");
  const plan=planQuoteImport(entries,existing);
  assert.deepEqual(plan.map(x=>x.operation),["skip","create","skip","error"]);
  assert.match(plan[3].reason,/verwijderd/);
});

test("CSV export escapes cell formulas, commas and quotes; JSON remains exact", () => {
  const result=exportQuotesCsv([{id:"q1",text:'=SUM(1,2) "test"',category:null,isActive:true}]);
  assert.ok(result.startsWith("\uFEFF"));
  assert.ok(result.includes("'=SUM(1,2)"));
  assert.ok(result.includes('""test""'));
  const imported=parseQuoteFile(result,"csv");
  assert.equal(imported.length,1);
  assert.ok(imported[0].text.startsWith("'="), "Spreadsheet formula escaped with apostrophe");
});

test("parser limits uploads, row counts and invalid UTF-8-sized text", () => {
  assert.throws(()=>parseQuoteFile("X".repeat(MAX_QUOTE_FILE_BYTES+1),"json"),/128 KB/);
  assert.throws(()=>parseQuoteFile(JSON.stringify(Array.from({length:251},()=>({text:"x"}))),"json"),/250/);
});
