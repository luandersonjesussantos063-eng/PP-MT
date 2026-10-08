import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createAnswerSounds} from '../answer-sounds.js';
test('som corresponde ao resultado, para o anterior e respeita preferência de silêncio',()=>{
 let enabled=true;const clips=[];
 const sounds=createAnswerSounds({enabled:()=>enabled,makeAudio:url=>{const a={url,plays:0,currentTime:10,pause(){this.paused=true},play(){this.plays++;return Promise.resolve()}};clips.push(a);return a}});
 sounds.play(true);assert.equal(clips[0].plays,1);assert.equal(clips[1].plays,0);assert.equal(clips[1].currentTime,0);
 sounds.play(false);assert.equal(clips[1].plays,1);assert.equal(clips[0].paused,true);
 enabled=false;sounds.play(true);assert.equal(clips[0].plays,1);
});
test('bloqueio de áudio não impede a correção nem causa rejeição não tratada',async()=>{
 const rejected=createAnswerSounds({makeAudio:()=>({pause(){},play(){return Promise.reject(Error('blocked'))}})});assert.doesNotThrow(()=>rejected.play(true));await new Promise(r=>setImmediate(r));
 const thrown=createAnswerSounds({makeAudio:()=>({pause(){},play(){throw Error('blocked')}})});assert.doesNotThrow(()=>thrown.play(false));
});
test('clipes PCM extraídos são publicados e ficam no cache offline',()=>{
 for(const name of ['correct','wrong']){const file=fs.readFileSync(new URL(`../assets/audio/${name}.wav`,import.meta.url));assert.equal(file.toString('ascii',0,4),'RIFF');assert.equal(file.toString('ascii',8,12),'WAVE');assert.ok(file.length>60000);const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');assert.ok(sw.includes(`assets/audio/${name}.wav?v=45`));}
});
