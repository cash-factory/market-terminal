import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/assets");
const read = name => fs.readFileSync(path.join(assets, name));
const exists = name => fs.existsSync(path.join(assets, name));
const json = name => JSON.parse(read(name).toString("utf8"));
const manifest = json("manifest.json"), registry = json("icons/registry.json");
const fail = (name, detail) => {throw new Error(`${name}: ${detail}`)};

assert.equal(manifest.name, "Market Terminal — Peak visual asset library");
assert.equal(registry.icons.length, manifest.counts.icons);
assert.equal(new Set(registry.icons.map(icon => icon.id)).size, registry.icons.length);
for(const file of ["gallery.html", "USAGE.md", "brand/favicon.svg", "brand/mark.svg", "brand/lockup-dark.svg","backgrounds/peak-horizon-dark.svg","maps/session-world.svg","icons/terminal-symbols.svg"]){assert.ok(exists(file), `Missing asset ${file}`);}
for(const category of ["navigation","data","replay","analysis","drawing","actions","status"]){assert.ok(registry.icons.some(icon => icon.category === category), `Missing icon family ${category}`);}
const sprite = read("icons/terminal-symbols.svg").toString("utf8");
for(const icon of registry.icons){
 assert.match(icon.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
 assert.ok(exists(icon.individual), `Missing individual icon ${icon.id}`);
 assert.ok(sprite.includes(`id="${icon.id}"`), `Missing sprite symbol ${icon.id}`);
}
for(const slug of manifest.illustrations){assert.ok(exists(`illustrations/${slug}.svg`),`Missing illustration ${slug}`);}
assert.equal(new Set(manifest.illustrations).size, manifest.illustrations.length);
for(const cue of manifest.audio){
 assert.ok(exists(cue.path),`Missing sound ${cue.path}`);
 const buf=read(cue.path);
 assert.equal(buf.toString("ascii",0,4),"RIFF");
 assert.equal(buf.toString("ascii",8,12),"WAVE");
 assert.equal(buf.toString("ascii",12,16),"fmt ");
 assert.equal(buf.toString("ascii",36,40),"data");
 assert.equal(buf.readUInt16LE(20),1,"WAV must use PCM");
 assert.equal(buf.readUInt16LE(22),1,"WAV must use mono");
 assert.equal(buf.readUInt32LE(24),22050,"Unexpected sample rate");
 assert.equal(buf.readUInt16LE(34),16,"Expected 16-bit WAV");
 assert.equal(buf.readUInt32LE(40),buf.length-44,"Corrupt WAV data size");
 let peak=0;
 for(let i=44;i<buf.length;i+=2)peak=Math.max(peak,Math.abs(buf.readInt16LE(i)));
 assert.ok(peak<0.21*32767,`Sound ${cue.id} unexpectedly loud`);
}
const checkXML=(src,name)=>{
 const text=src.toString("utf8");
 if(!/^<svg\b/.test(text.trim()) || !/<\/svg>\s*$/.test(text))fail(name,"Missing complete SVG root");
 const stack=[];
 const rx=/<(\/?[A-Za-z][\w:-]*)\b[^>]*?>/g;
 let m;
 while((m=rx.exec(text))){
  const full=m[0],tag=m[1];
  if(tag.startsWith("/")){const closing=tag.slice(1),open=stack.pop();if(open!==closing)fail(name,`Unbalanced tag: ${closing} versus ${open}`);}
  else if(!full.endsWith("/>"))stack.push(tag);
 }
 if(stack.length)fail(name,`Unclosed XML elements: ${stack.join(", ")}`);
 if(/(?:href|xlink:href)="https?:\/\//.test(text))fail(name,"External resource dependency");
};
let svgCount=0;
function walk(dir){
 for(const item of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,item.name);
  if(item.isDirectory())walk(file);
  else if(file.endsWith(".svg")){
   const relative=path.relative(assets,file);
   checkXML(fs.readFileSync(file),relative);
   svgCount++;
  }
 }
}
walk(assets);
assert.equal(svgCount,manifest.counts.brand+manifest.counts.backgrounds+manifest.counts.icons+manifest.counts.iconSprite+manifest.counts.illustrations+manifest.counts.sessionMaps);
const gallery=read("gallery.html").toString("utf8");
assert.ok(!/<audio[^>]*autoplay/i.test(gallery),"No autoplay sound allowed");
assert.ok(gallery.includes("icon-search") && gallery.includes("illustration-grid"),"Asset gallery incomplete");
console.log(`Peak asset audit passed: ${svgCount} SVGs, ${manifest.audio.length} WAVs, ${registry.icons.length} icons, ${manifest.illustrations.length} illustrations.`);
