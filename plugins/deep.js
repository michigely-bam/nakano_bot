import fs from 'fs'
import https from 'https'
import http from 'http'
import path from 'path'

const HISTORY_FILE = './database/deepseek-history.json'
const AUTH_TOKEN = '6BlcX27kt9QGTSn5AffdmdJ9BXNURnT4jeoq8XsmDT4KSB5H4tohd+pDNiDIZO3M'
const HIF_LEIM = '4GtkyddaB/QtHQRosDzjN7XBB17zmWBmKTynFHDWe8hat/zVwEwBm+k=.KLuEh0+vYL3DkPZo'

const RC_U32 = new Uint32Array([1,0,32898,0,32906,2147483648,2147516416,2147483648,32907,0,2147483649,0,2147516545,2147483648,32841,2147483648,138,0,136,0,2147516553,0,2147483658,0,2147516595,0,139,2147483648,32905,2147483648,32771,2147483648,32770,2147483648,128,2147483648,32778,0,2147483658,2147483648,2147516545,2147483648,32832,2147483648,2147483649,0,2147516552,2147483648])
const rho = [0,1,62,28,27,36,44,6,55,20,3,10,43,25,39,41,45,15,21,8,18,2,61,56,14]
const piMap = [0,10,20,5,15,16,1,11,21,6,7,17,2,12,22,23,8,18,3,13,14,24,9,19,4]
const RATE = 136
const _c = new Uint32Array(10)
const _d = new Uint32Array(10)
const _b = new Uint32Array(50)

function keccakF(s){for(let r=1;r<24;r++){for(let x=0;x<5;x++){_c[2*x]=s[2*x]^s[2*(x+5)]^s[2*(x+10)]^s[2*(x+15)]^s[2*(x+20)];_c[2*x+1]=s[2*x+1]^s[2*(x+5)+1]^s[2*(x+10)+1]^s[2*(x+15)+1]^s[2*(x+20)+1]}for(let x=0;x<5;x++){const n=(x+1)%5,p=(x+4)%5;const cl=_c[2*n],ch=_c[2*n+1];_d[2*x]=_c[2*p]^((cl<<1|ch>>>31)>>>0);_d[2*x+1]=_c[2*p+1]^((ch<<1|cl>>>31)>>>0)}for(let i=0;i<25;i++){const x=i%5;const lo=s[2*i]^_d[2*x];const hi=s[2*i+1]^_d[2*x+1];const k=rho[i];let rl,rh;if(k===0){rl=lo;rh=hi}else if(k<32){rl=(lo<<k|hi>>>(32-k))>>>0;rh=(hi<<k|lo>>>(32-k))>>>0}else if(k===32){rl=hi;rh=lo}else{const k2=k-32;rl=(hi<<k2|lo>>>(32-k2))>>>0;rh=(lo<<k2|hi>>>(32-k2))>>>0}const p=piMap[i];_b[2*p]=rl;_b[2*p+1]=rh}for(let y=0;y<5;y++){const rb=5*y;const i0=rb,i1=rb+1,i2=rb+2,i3=rb+3,i4=rb+4;s[2*i0]=_b[2*i0]^(~_b[2*i1]&_b[2*i2]);s[2*i0+1]=_b[2*i0+1]^(~_b[2*i1+1]&_b[2*i2+1]);s[2*i1]=_b[2*i1]^(~_b[2*i2]&_b[2*i3]);s[2*i1+1]=_b[2*i1+1]^(~_b[2*i2+1]&_b[2*i3+1]);s[2*i2]=_b[2*i2]^(~_b[2*i3]&_b[2*i4]);s[2*i2+1]=_b[2*i2+1]^(~_b[2*i3+1]&_b[2*i4+1]);s[2*i3]=_b[2*i3]^(~_b[2*i4]&_b[2*i0]);s[2*i3+1]=_b[2*i3+1]^(~_b[2*i4+1]&_b[2*i0+1]);s[2*i4]=_b[2*i4]^(~_b[2*i0]&_b[2*i1]);s[2*i4+1]=_b[2*i4+1]^(~_b[2*i0+1]&_b[2*i1+1])}s[0]^=RC_U32[2*r];s[1]^=RC_U32[2*r+1]}}
function absorb(s,d){for(let i=0;i<17;i++){const b=i*8;s[2*i]^=(d[b]|(d[b+1]<<8)|(d[b+2]<<16)|(d[b+3]<<24))>>>0;s[2*i+1]^=(d[b+4]|(d[b+5]<<8)|(d[b+6]<<16)|(d[b+7]<<24))>>>0}}
function solvePow(c,s,e,d){const p=Buffer.from(s+'_'+e+'_');const bs=new Uint32Array(50);let o=0;while(o+RATE<=p.length){absorb(bs,p.subarray(o));keccakF(bs);o+=RATE}const t=Buffer.from(c,'hex');const T=new Uint32Array(8);for(let i=0;i<4;i++){const b=i*8;T[2*i]=(t[b]|(t[b+1]<<8)|(t[b+2]<<16)|(t[b+3]<<24))>>>0;T[2*i+1]=(t[b+4]|(t[b+5]<<8)|(t[b+6]<<16)|(t[b+7]<<24))>>>0}const nb=Buffer.alloc(20);const bf=Buffer.alloc(RATE);p.copy(bf,0,o);const st=new Uint32Array(50);const bf2=Buffer.alloc(RATE);for(let n=0;n<d;n++){st.set(bs);let po=20;if(n===0){po=19;nb[po]=48}else{let tm=n;while(tm>0){po--;nb[po]=48+(tm%10);tm=Math.floor(tm/10)}}const nl=20-po;const tt=o+nl;if(tt<RATE){bf.fill(0,o);nb.copy(bf,o,po,po+nl);bf[tt]=6;bf[RATE-1]=128;absorb(st,bf);keccakF(st)}else{bf.fill(0,o);const fc=RATE-o;nb.copy(bf,o,po,po+fc);absorb(st,bf);keccakF(st);const rm=tt-RATE;bf2.fill(0);nb.copy(bf2,0,po+fc,po+fc+rm);bf2[rm]=6;bf2[RATE-1]=128;absorb(st,bf2);keccakF(st)}if(st[0]===T[0]&&st[1]===T[1]&&st[2]===T[2]&&st[3]===T[3]&&st[4]===T[4]&&st[5]===T[5]&&st[6]===T[6]&&st[7]===T[7])return n}return -1}
function mkH(e){return{'Content-Type':'application/json','Authorization':`Bearer ${AUTH_TOKEN}`,'x-client-bundle-id':'com.deepseek.chat','x-client-platform':'web','x-client-version':'2.2.0','x-client-locale':'es_US','x-client-timezone-offset':String(-new Date().getTimezoneOffset()),'x-client-timezone':Intl.DateTimeFormat().resolvedOptions().timeZone,'x-hif-leim':HIF_LEIM,...e}}
function apiR(m,u,h,b,cb){return new Promise((re,rj)=>{const U=new URL(u);const mod=U.protocol==='https:'?https:http;const req=mod.request({hostname:U.hostname,path:U.pathname,method:m,headers:h},res=>{const ct=res.headers['content-type']||'';if(cb&&ct.includes('text/event-stream')){let bu='',tx='',ap=false,ri=null;const fl=()=>{const ls=bu.split('\n');bu=ls.pop()||'';for(const l of ls){const t=l.trim();if(!t)continue;if(t.startsWith('event: '))continue;if(!t.startsWith('data: '))continue;const d=t.slice(6);if(d==='[DONE]')continue;try{const j=JSON.parse(d);if(j.response_message_id)ri=j.response_message_id;let tk='';if(j.p==='response/fragments/-1/content'&&j.o==='APPEND'){tk=j.v;ap=true}else if(ap&&typeof j.v==='string')tk=j.v;else if(!ap&&j.v&&j.v.response&&j.v.response.fragments&&j.v.response.fragments[0]&&j.v.response.fragments[0].content)tk=j.v.response.fragments[0].content;if(j.o==='BATCH')ap=false;if(tk){tx+=tk;cb(tk)}}catch{}}};res.on('data',c=>{bu+=c;fl()});res.on('end',()=>{if(bu.trim()){bu+='\n';fl()}re({text:tx,rid:ri})})}else{let da='';res.on('data',c=>da+=c);res.on('end',()=>{if(ct.includes('text/event-stream'))re({sse:true,data:da});else try{re(JSON.parse(da))}catch{re(da)}})}});req.on('error',rj);req.setTimeout(60000,()=>req.destroy(new Error('Timeout')));if(b)req.write(JSON.stringify(b));req.end()})}
async function chat(si,msg,h){const ph=await apiR('POST','https://chat.deepseek.com/api/v0/chat/create_pow_challenge',mkH(),{target_path:'/api/v0/chat/completion'});if(ph.code!==0)throw new Error('PoW');const ch=ph.data.biz_data.challenge;const no=solvePow(ch.challenge,ch.salt,ch.expire_at,ch.difficulty||144000);if(no===-1)throw new Error('PoW');const phd=Buffer.from(JSON.stringify({algorithm:'DeepSeekHashV1',challenge:ch.challenge,salt:ch.salt,answer:no,signature:ch.signature,target_path:ch.target_path||'/api/v0/chat/completion'})).toString('base64');if(!h.sessions[si])h.sessions[si]={messages:[],lastResponseId:null};const pi=h.sessions[si].lastResponseId;let rs='';const re=await apiR('POST','https://chat.deepseek.com/api/v0/chat/completion',mkH({'x-ds-pow-response':phd}),{chat_session_id:si,parent_message_id:pi,model_type:'default',prompt:msg,ref_file_ids:[],thinking_enabled:false,search_enabled:false,action:null,preempt:false,system_prompt:'Eres Michigely_bam'},tk=>{rs+=tk});const {text,rid}=re;h.sessions[si].messages.push({role:'user',content:msg},{role:'assistant',content:text});h.sessions[si].lastResponseId=rid;h.lastSessionId=si;fs.writeFileSync(HISTORY_FILE,JSON.stringify(h,null,2));return text}

export default{
name:'deepseek',
alias:['ds','deep'],
category:'IA',
description:'Chatea con DeepSeek',
async execute(s,m,{config,a}){
const f=m.key.remoteJid
const t=a.join(' ')
if(!t)return s.sendMessage(f,{text:`Uso: ${config.prefix}deepseek <texto>`},{quoted:m})
await s.sendMessage(f,{text:'🤖 Consultando...'})
let h
try{h=JSON.parse(fs.readFileSync(HISTORY_FILE,'utf8'))}catch{h={lastSessionId:null,sessions:{}}}
let si=h.lastSessionId
if(!si){const r=await apiR('POST','https://chat.deepseek.com/api/v0/chat_session/create',mkH(),{});si=r.data.biz_data.chat_session.id}
try{const r=await chat(si,t,h);await s.sendMessage(f,{text:`✨ *DeepSeek*\n\n${r}`},{quoted:m})}catch(e){await s.sendMessage(f,{text:`❌ ${e.message}`},{quoted:m})}
}
}