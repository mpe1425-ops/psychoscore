import './style.css';
import * as XLSX from 'xlsx';
import {parseIt,val,calc,f2,parseDelim,clean} from './engine.js';

const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PRE={
 '1–5':[1,2,3,4,5].map(v=>[String(v),v]),'1–7':[1,2,3,4,5,6,7].map(v=>[String(v),v]),
 '−3…+3':[-3,-2,-1,0,1,2,3].map(v=>[(v>0?'+':'')+v,v]),
 'Да/Нет':[['Да',1],['Нет',0]],'Да/Нет/Не знаю':[['Да',2],['Не знаю',1],['Нет',0]]};
const mk=(name,pre,n)=>({id:Date.now()+Math.random(),name,opts:PRE[pre].map(a=>({l:a[0],v:a[1]})),
 items:Array.from({length:n},(_,i)=>({t:'Пункт '+(i+1),r:false})),scales:[{name:'Общий балл',it:'1-'+n,f:'sum',m:'',sd:''}],conv:'none',rows:[]});
let S=JSON.parse(localStorage.getItem('psy2')||'null')||{cur:0,tab:0,ms:[mk('Пример (шкала 1–5)','1–5',6)]};
const M=()=>S.ms[S.cur];let fh=null,tm;
function save(){S.tpl=S.tpl||[];try{localStorage.setItem('psy2',JSON.stringify(S))}catch(e){}
 clearTimeout(tm);tm=setTimeout(async()=>{if(!fh)return;try{const w=await fh.createWritable();await w.write(JSON.stringify(S,null,1));await w.close()}catch(e){fh=null;toast('Автосохранение в файл прервано — сохраните файл заново')}},700)}
function toast(t){const e=$('#toast');e.textContent=t;e.style.opacity=1;clearTimeout(e._t);e._t=setTimeout(()=>e.style.opacity=0,3000)}
const $o=h=>$('#ov').innerHTML=h?`<div class="ov" onclick="if(event.target==this)$o('')"><div class="bx">${h}</div></div>`:'';
async function saveFile(){const j=JSON.stringify(S,null,1);
 if(window.showSaveFilePicker){try{fh=await showSaveFilePicker({suggestedName:'психоскор-данные.json',types:[{accept:{'application/json':['.json']}}]});
  const w=await fh.createWritable();await w.write(j);await w.close();toast('Файл сохранён. Дальше все изменения записываются в него автоматически.')}catch(e){}return}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([j],{type:'application/json'}));a.download='психоскор-данные.json';a.click();toast('Файл сохранён в «Загрузки»')}
function openFile(f){if(!f)return;const r=new FileReader();r.onload=()=>{let d;try{d=JSON.parse(r.result);if(!Array.isArray(d.ms))throw 0}catch(e){return alert('Это не файл ПсихоСкор.')}
 S.tpl=S.tpl||[];
 if(d.ms.length&&confirm('ОК — ЗАМЕНИТЬ текущие данные данными из файла.\nОтмена — ДОБАВИТЬ методики и шаблоны из файла к текущим.')){S=d;S.cur=0;S.seen=1}
 else{d.ms.forEach(m=>{m.id=Date.now()+Math.random();S.ms.push(m)});(d.tpl||[]).forEach(t=>{S.tpl=S.tpl.filter(x=>x.name!=t.name);S.tpl.push(t)})}
 S.tpl=S.tpl||[];$o('');render();toast('Файл загружен')};r.readAsText(f,'utf-8')}
function saveTpl(){if($('#op'))saveOpts();const m=M(),n=prompt('Название шаблона (например «СМИЛ-566»):',m.name);if(!n)return;
 const c=JSON.parse(JSON.stringify(m));c.name=n;c.rows=[];S.tpl=(S.tpl||[]).filter(t=>t.name!=n);S.tpl.push(c);save();toast('Шаблон «'+n+'» сохранён')}
let SH=[];
async function loadShared(){const get=async u=>{const r=await fetch(u+'?'+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;return r.json()};
 const m=new Map();let ok=false;const add=d=>(d.tpl||[]).forEach(t=>m.set(t.name,t));
 try{add(await get('./shared-templates.json'));ok=true}catch(e){}
 try{const idx=await get('./templates/index.json');ok=true;await Promise.all(idx.map(async f=>{try{add(await get('./templates/'+encodeURIComponent(f)))}catch(e){}}))}catch(e){}
 if(ok){SH=[...m.values()];try{localStorage.setItem('psy-shared',JSON.stringify(SH))}catch(e){}}
 else{try{SH=JSON.parse(localStorage.getItem('psy-shared')||'[]')}catch(_){SH=[]}}}
function tplList(){const t=S.tpl||[],g={},sg={},k=x=>x.cat||'Без категории';
 t.forEach((x,i)=>(g[k(x)]=g[k(x)]||[]).push(i));SH.forEach((x,i)=>(sg[k(x)]=sg[k(x)]||[]).push(i));
 const grp=(G,arr,mine)=>Object.keys(G).sort().map(c=>`<div class="cat" style="color:var(--hd)">${esc(c)}</div>`+G[c].map(i=>`<div class="row" style="justify-content:space-between"><b>${esc(arr[i].name)}</b><span><button class="o" onclick="${mine?`useTpl(${i})`:`useShared(${i})`}">Создать</button>${mine?` <button class="g" title="Скачать шаблон файлом: передать коллеге или добавить в общую библиотеку" onclick="expTpl(${i})">⬇</button> <button class="x" title="Удалить шаблон" onclick="delTpl(${i})">✕</button>`:''}</span></div>`).join('')).join('');
 $o('<h2>Шаблоны методик</h2>'+(SH.length?'<h3>🌐 Общая библиотека</h3>'+grp(sg,SH,false):'')+'<h3>★ Мои шаблоны</h3>'+(t.length?grp(g,t,true):'<p>Пока пусто. Настройте методику и нажмите «★ Сохранить как шаблон» на вкладке «Настройка».</p>')+'<div class="row"><button class="g" onclick="$(\'#fo\').click()">📂 Загрузить шаблон из файла</button>'+'<button class="g" onclick="$o(\'\')">Закрыть</button></div>')}
function useShared(i){const c=JSON.parse(JSON.stringify(SH[i]));c.id=Date.now()+Math.random();c.rows=[];S.ms.push(c);S.cur=S.ms.length-1;S.tab=1;$o('');render()}
function expAll(){const m=new Map();SH.forEach(t=>m.set(t.name,t));(S.tpl||[]).forEach(t=>m.set(t.name,t));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({ms:[],tpl:[...m.values()]},null,1)],{type:'application/json'}));a.download='shared-templates.json';a.click();
 toast('Скачан shared-templates.json — загрузите его в папку public репозитория (с заменой)')}
function expTpl(i){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({ms:[],tpl:[S.tpl[i]]},null,1)],{type:'application/json'}));a.download='шаблон-'+S.tpl[i].name+'.json';a.click()}
function useTpl(i){const c=JSON.parse(JSON.stringify(S.tpl[i]));c.id=Date.now()+Math.random();c.rows=[];S.ms.push(c);S.cur=S.ms.length-1;S.tab=1;$o('');render()}
function delTpl(i){if(confirm('Удалить шаблон «'+S.tpl[i].name+'»?')){S.tpl.splice(i,1);save();tplList()}}
const TUT=[['Добро пожаловать в ПсихоСкор','Программа считает баллы по любым методикам. <b>Слева</b> — список ваших методик, <b>сверху</b> три вкладки: «Настройка» → «Ввод данных» → «Результаты». Один раз настроили методику — дальше только вносите ответы.'],
['1. Настройка методики','Выберите шаблон ответов (1–5, 1–7, −3…+3, Да/Нет…) и при необходимости измените баллы за каждый вариант. Добавьте пункты (можно вставить сразу списком). У зеркальных пунктов поставьте галочку: баллы инвертируются (1↔5, 2↔4).'],
['2. Шкалы и формулы','Шкала — это набор пунктов, например «1-5, 8, 10». Формула: <b>sum</b> (сумма), <b>avg</b> (среднее) или своя, например <code>sum*2+5</code>. Один пункт может входить в несколько шкал. Для перевода в T-баллы, стены и т. д. укажите среднее и σ из норм.'],
['3. Ввод данных','Добавьте испытуемого и внесите ответы в таблицу — баллом или подписью («Да»). Пустая клетка — пропуск, он не учитывается. Можно скопировать ячейки в Excel и нажать «Вставить из Excel» либо загрузить CSV-файл.'],
['4. Результаты и сохранение','На вкладке «Результаты» итоги считаются автоматически; кнопка «Выгрузить в Excel» создаёт таблицу. Готовую методику сохраните как <b>★ шаблон</b> и создавайте из него новые за секунду. Кнопка <b>💾 Сохранить в файл</b> делает резервную копию всех данных на компьютере (в Edge/Chrome после этого запись в файл идёт автоматически). Это обучение всегда можно открыть кнопкой «? Обучение».']];
function tut(i=0){const T=TUT[i],l=i==TUT.length-1;$o(`<h2>${T[0]}</h2><p>${T[1]}</p><small>Шаг ${i+1} из ${TUT.length}</small><div class="row" style="margin-top:14px;justify-content:space-between"><button class="g" onclick="endTut()">Пропустить</button><span>${i?`<button class="g" onclick="tut(${i-1})">Назад</button> `:''}<button class="o" onclick="${l?'endTut()':`tut(${i+1})`}">${l?'Готово':'Далее'}</button></span></div>`)}
function endTut(){S.seen=1;$o('');save()}
const H=['💡 Настройте методику один раз: ответы → пункты → шкалы. Потом сохраните её как ★ шаблон. Изменения сохраняются автоматически.','💡 Вносите ответы баллом или подписью («Да»). Пустая клетка = пропуск. Значок ↺ у номера пункта — он зеркальный.','💡 Результаты пересчитываются сами. Столбец «n» — сколько пунктов учтено в шкале.'];
const TIPS={'+ Новая методика':'Создать пустую методику','+ Пункт':'Добавить вопрос','+ Шкала':'Добавить шкалу подсчёта','+ Испытуемый':'Добавить строку в таблицу','Применить варианты':'Сохранить изменённые варианты ответов','★ Сохранить как шаблон':'Запомнить настройки методики (без данных) для повторного использования','Выгрузить в Excel':'Скачать результаты в виде таблицы, открывается в Excel','Вставить список пунктов':'Добавить много пунктов сразу, по одному на строку','зеркальный':'Обратный подсчёт: 1↔5, 2↔4, −3↔+3','Удалить методику':'Удалить методику вместе с данными','💾 Сохранить в файл':'Резервная копия всех методик, шаблонов и данных в файле на компьютере','📂 Открыть файл':'Загрузить ранее сохранённый файл','Загрузить из Excel / CSV':'Файлы .xlsx, .xls (XML/HTML), .csv, .txt. Колонки — по порядку пунктов','🗑 Удалить все ответы':'Очистить таблицу этой методики, настройки останутся','Вставить из Excel (буфер)':'Скопируйте ячейки в Excel (Ctrl+C), затем нажмите эту кнопку'};
const tips=()=>document.querySelectorAll('button,label').forEach(b=>{const t=TIPS[b.textContent.trim()];if(t)b.title=t});
function side(){const g={};S.ms.forEach((m,i)=>(g[m.cat||'Без категории']=g[m.cat||'Без категории']||[]).push(i));
 $('#list').innerHTML=Object.keys(g).sort().map(c=>`<div class="cat">${esc(c)}</div>`+g[c].map(i=>`<div class="m ${i==S.cur?'a':''}" onclick="S.cur=${i};render()" style="display:flex;justify-content:space-between"><span>${esc(S.ms[i].name)}</span><span title="Удалить методику" onclick="event.stopPropagation();delM(${i})">✕</span></div>`).join('')).join('')}
const cats=()=>[...new Set([...S.ms,...(S.tpl||[])].map(m=>m.cat).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('');
function render(){side();
 if(!M()){$('#tabs').innerHTML='';$('#v').innerHTML='<p>Создайте методику слева или выберите «★ Создать из шаблона».</p>';return}
 $('#tabs').innerHTML=['Настройка','Ввод данных','Результаты'].map((t,i)=>`<div class="tab ${i==S.tab?'a':''}" onclick="S.tab=${i};render()">${t}</div>`).join('');
 [setup,data,results][S.tab]();$('#v').insertAdjacentHTML('afterbegin','<div class="hint">'+H[S.tab]+'</div>');tips();save()}
function addM(){const n=prompt('Название методики:');if(!n)return;S.ms.push(mk(n,'1–5',10));S.cur=S.ms.length-1;S.tab=0;render()}
function delM(i=S.cur){if(confirm('Удалить методику «'+S.ms[i].name+'» вместе с введёнными данными?\n(Настройки можно сохранить как шаблон.)')){S.ms.splice(i,1);S.cur=0;render()}}
function setup(){const m=M();
 $('#v').innerHTML=`<div class="card"><h3>Основное</h3><div class="row">Название <input value="${esc(m.name)}" size="40" onchange="M().name=this.value;side();save()"> Категория <input list="cats" size="20" placeholder="напр. Личность" value="${esc(m.cat||'')}" onchange="M().cat=this.value.trim();side();save()"><datalist id="cats">${cats()}</datalist>
 <button class="g" onclick="saveTpl()">★ Сохранить как шаблон</button> <button class="g" onclick="delM()">Удалить методику</button></div></div>
 <div class="card"><h3>Варианты ответов</h3><div class="row">Шаблон: ${Object.keys(PRE).map(k=>`<button class="g" onclick="pre('${k}')">${k}</button>`).join('')}</div>
 <div class="row"><textarea id="op" rows="6" cols="30" oninput="saveOpts()">${m.opts.map(o=>o.l+';'+o.v).join('\n')}</textarea>
 <small>Каждая строка: «подпись;баллы». Сохраняется автоматически.<br>Зеркальный пункт: балл = мин + макс − балл<br>(1↔5, 2↔4, −3↔+3…).</small></div>
 </div>
 <div class="card"><h3>Пункты (вопросы)</h3><small>Галочка «зеркальный» — обратный подсчёт для пункта.</small>
 ${m.items.map((it,i)=>`<div class="row"><b style="width:28px">${i+1}</b><input size="60" value="${esc(it.t)}" onchange="M().items[${i}].t=this.value">
 <label><input type="checkbox" ${it.r?'checked':''} onchange="M().items[${i}].r=this.checked;save()"> зеркальный</label>
 <button class="x" onclick="M().items.splice(${i},1);M().rows.forEach(r=>r.a.splice(${i},1));render()">✕</button></div>`).join('')}
 <div class="row"><button class="g" onclick="M().items.push({t:'Пункт '+(M().items.length+1),r:false});render()">+ Пункт</button>
 <button class="g" onclick="bulk()">Вставить список пунктов</button></div></div>
 <div class="card"><h3>Шкалы</h3><small>Пункты: «1-5, 8, 10». Формула: sum, avg или своя, напр. <code>sum*2+5</code>, <code>avg/n</code>; доступны n, i1…iN (баллы пунктов), s1…sK (предыдущие шкалы), Math.</small>
 ${m.scales.map((s,i)=>`<div class="row"><input placeholder="Название" value="${esc(s.name)}" onchange="M().scales[${i}].name=this.value">
 Пункты <input size="14" value="${esc(s.it)}" onchange="M().scales[${i}].it=this.value">
 Формула <input size="16" list="fl" value="${esc(s.f)}" onchange="M().scales[${i}].f=this.value">
 Среднее <input size="5" value="${esc(s.m)}" onchange="M().scales[${i}].m=this.value"> σ <input size="5" value="${esc(s.sd)}" onchange="M().scales[${i}].sd=this.value">
 <button class="x" onclick="M().scales.splice(${i},1);render()">✕</button></div>`).join('')}
 <datalist id="fl"><option>sum<option>avg</datalist>
 <button class="g" onclick="M().scales.push({name:'Шкала '+(M().scales.length+1),it:'',f:'sum',m:'',sd:''});render()">+ Шкала</button>
 <div class="row" style="margin-top:12px">Перевод в стандартные баллы (по среднему и σ из норм):
 <select onchange="M().conv=this.value;save()">${[['none','нет'],['z','z-баллы'],['T','T-баллы'],['sten','стены (1–10)'],['stanine','станайны (1–9)']].map(c=>`<option value="${c[0]}" ${m.conv==c[0]?'selected':''}>${c[1]}</option>`).join('')}</select></div></div>`}
function pre(k){M().opts=PRE[k].map(a=>({l:a[0],v:a[1]}));render()}
function saveOpts(){M().opts=$('#op').value.split('\n').map(l=>l.split(';')).filter(a=>a[0].trim()).map(a=>({l:a[0].trim(),v:parseFloat((a[1]||'0').replace(',','.'))||0}));save()}
function bulk(){const t=prompt('Вставьте список пунктов (каждый с новой строки):');if(!t)return;
 t.split('\n').filter(x=>x.trim()).forEach(x=>{M().items.push({t:x.trim(),r:false});M().rows.forEach(r=>r.a.push(''))});render()}




const nameOf=(m,r,y)=>m.showName!==false&&r.n?r.n:'№ '+(y+1);
const m_blank=()=>M().items.map(()=>'');
function data(){const m=M(),nm=m.showName!==false;
 $('#v').innerHTML=`<div class="card"><div class="row"><button class="o" onclick="M().rows.push({n:'',a:m_blank()});render()">+ Испытуемый</button>
 <button class="g" onclick="$('#fi').click()">Загрузить из Excel / CSV</button><input type="file" id="fi" accept=".xlsx,.xlsm,.xls,.csv,.tsv,.txt,.xml,.html,.htm" hidden onchange="load(this.files[0]);this.value=''">
 <button class="g" onclick="paste()">Вставить из Excel (буфер)</button><button class="g" onclick="clearRows()">🗑 Удалить все ответы</button></div>
 <div class="row"><label><input type="checkbox" ${nm?'checked':''} onchange="M().showName=this.checked;render()"> столбец «ФИО / код»</label>
 Заголовки в файле: <select id="hd"><option value="auto">определять сам</option><option value="1">есть</option><option value="0">нет</option></select></div>
 <small>💡 Можно скопировать блок ячеек в Excel и вставить Ctrl+V прямо в любую клетку таблицы — данные лягут от этой клетки. Enter — вниз по столбцу. ⌫ в строке — очистить ответы строки, ⌫ над столбцом — очистить столбец, ✕ — удалить строку.</small></div>
 <div class="w"><table><tr><th></th><th>${nm?'ФИО / код':'№'}</th>${m.items.map((_,i)=>`<th title="${esc(m.items[i].t)}">${i+1}${m.items[i].r?'↺':''}<span class="cx" title="Очистить ответы этого столбца у всех испытуемых" onclick="clearCol(${i})">⌫</span></th>`).join('')}</tr>
 ${m.rows.map((r,y)=>`<tr><td style="white-space:nowrap"><button class="x" title="Очистить ответы строки (ФИО останется)" onclick="clearRow(${y})">⌫</button><button class="x" title="Удалить строку" onclick="delRow(${y})">✕</button></td>
 ${nm?`<td><input data-r="${y}" data-c="-1" placeholder="№ ${y+1}" style="min-width:150px;text-align:left" value="${esc(r.n)}" onchange="M().rows[${y}].n=this.value;save()"></td>`:`<td style="text-align:center;padding:0 8px"><b>${y+1}</b></td>`}
 ${m.items.map((_,i)=>`<td><input data-r="${y}" data-c="${i}" value="${esc(r.a[i])}" onchange="M().rows[${y}].a[${i}]=this.value;save()"></td>`).join('')}</tr>`).join('')}</table></div>`}
function clearRow(y){M().rows[y].a=m_blank();render()}
function delRow(y){M().rows.splice(y,1);render()}
function clearCol(i){if(confirm('Очистить ответы на пункт №'+(i+1)+' у всех испытуемых?')){M().rows.forEach(r=>r.a[i]='');render()}}
function clearRows(){const m=M();if(!m.rows.length)return toast('Таблица уже пуста');if(confirm('Удалить всех испытуемых и их ответы в методике «'+m.name+'» ('+m.rows.length+' чел.)?\nНастройки методики сохранятся. Действие нельзя отменить.')){m.rows=[];render();toast('Все ответы удалены')}}


function ingest(rows){const m=M(),nm=m.showName!==false,off=nm?1:0;rows=rows.map(r=>r.map(clean)).filter(r=>r.some(x=>x!==''));
 if(!rows.length)return toast('В файле нет данных');
 const mode=$('#hd')?$('#hd').value:'auto',hdr=mode=='1'||(mode=='auto'&&!rows[0].slice(off).some(c=>val(m,c,false)!==null));
 if(hdr)rows.shift();if(!rows.length)return toast('После заголовков данных нет');
 const w=Math.max(...rows.map(r=>r.length))-off;
 rows.forEach(r=>m.rows.push({n:nm?(r[0]||''):'',a:m.items.map((_,i)=>r[i+off]||'')}));render();
 toast('Загружено строк: '+rows.length+(hdr?' (заголовки пропущены)':'')+'. Столбцов с ответами: '+w+', пунктов в методике: '+m.items.length+(w!=m.items.length?' — проверьте соответствие!':''))}
const X=t=>new DOMParser().parseFromString(t,'application/xml');

function sheetRows(b){const wb=XLSX.read(b,{type:'array'});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:''})}
function decode(u){if(u[0]==0xFF&&u[1]==0xFE)return new TextDecoder('utf-16le').decode(u);if(u[0]==0xFE&&u[1]==0xFF)return new TextDecoder('utf-16be').decode(u);
 try{return new TextDecoder('utf-8',{fatal:true}).decode(u)}catch(e){return new TextDecoder('windows-1251').decode(u)}}
function textRows(t){
 if(/^\s*<\?xml/i.test(t)&&t.includes('urn:schemas-microsoft-com:office:spreadsheet')){const rows=[];
  X(t).querySelector('Table').querySelectorAll('Row').forEach(r=>{const a=[];let i=0;r.querySelectorAll('Cell').forEach(c=>{const ix=c.getAttribute('ss:Index');if(ix)i=+ix-1;const dd=c.querySelector('Data');a[i++]=dd?dd.textContent:''});rows.push(Array.from(a,v=>v??''))});return rows}
 if(/<table/i.test(t)){const tb=new DOMParser().parseFromString(t,'text/html').querySelector('table');return[...tb.rows].map(r=>[...r.cells].map(c=>c.textContent))}
 return parseDelim(t)}
async function load(f){if(!f)return;try{const b=await f.arrayBuffer(),u=new Uint8Array(b);
 ingest((u[0]==0x50&&u[1]==0x4B)||(u[0]==0xD0&&u[1]==0xCF)?sheetRows(b):textRows(decode(u)))}catch(e){alert('Не удалось прочитать файл. Сохраните таблицу как .xlsx или CSV и попробуйте снова.')}}
async function paste(){let t='';try{t=await navigator.clipboard.readText()}catch(e){t=prompt('Вставьте скопированные из Excel ячейки (Ctrl+V):')||''}if(t)ingest(parseDelim(t))}
document.addEventListener('paste',e=>{const t=e.target;if(!t.dataset||t.dataset.c===undefined)return;const txt=(e.clipboardData||window.clipboardData).getData('text');
 if(!/[\t\n]/.test(txt.trim()))return;e.preventDefault();const g=parseDelim(txt),r0=+t.dataset.r,c0=+t.dataset.c,m=M();
 g.forEach((row,dy)=>{const y=r0+dy;while(m.rows.length<=y)m.rows.push({n:'',a:m_blank()});row.forEach((v,dx)=>{const c=c0+dx;v=clean(v);if(c==-1)m.rows[y].n=v;else if(c>=0&&c<m.items.length)m.rows[y].a[c]=v})});render();toast('Вставлено строк: '+g.length)});
document.addEventListener('keydown',e=>{const t=e.target;if(e.key=='Enter'&&t.dataset&&t.dataset.c!==undefined){const n=document.querySelector(`input[data-r="${+t.dataset.r+1}"][data-c="${t.dataset.c}"]`);if(n){n.focus();n.select()}}});
function results(){const m=M(),cv=m.conv!='none';
 $('#v').innerHTML=`<div class="card"><div class="row"><button class="o" onclick="exp()">Выгрузить в Excel</button><small>Пропущенные ответы не учитываются. Колонка «n» — число учтённых пунктов.</small></div></div>
 <div class="w"><table><tr><th>${m.showName!==false?'ФИО / код':'№'}</th>${m.scales.map(s=>`<th>${esc(s.name)}</th>${cv?`<th>${esc(s.name)} (${m.conv})</th>`:''}<th>n</th>`).join('')}</tr>
 ${m.rows.map((r,y)=>{const c=calc(m,r);return`<tr><td style="padding:5px 8px">${esc(nameOf(m,r,y))}</td>`+c.map(o=>`<td style="padding:5px 8px;text-align:center"><b>${f2(o.x)}</b></td>${cv?`<td style="padding:5px 8px;text-align:center">${f2(o.c)}</td>`:''}<td style="padding:5px 8px;text-align:center;color:#889">${o.n}</td>`).join('')+'</tr>'}).join('')}</table></div>`}
function exp(){const m=M(),cv=m.conv!='none';
 const h=[m.showName!==false?'ФИО / код':'№',...m.scales.flatMap(s=>[s.name,...(cv?[s.name+' ('+m.conv+')']:[]),'n'])];
 const rows=m.rows.map((r,y)=>[nameOf(m,r,y),...calc(m,r).flatMap(o=>[f2(o.x),...(cv?[f2(o.c)]:[]),o.n])]);
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([h,...rows]),'Результаты');
 XLSX.writeFile(wb,m.name.replace(/[\\/:*?"<>|]/g,'_')+'.xlsx')}
function theme(){const d=document.documentElement,n=d.dataset.theme=='dark'?'light':'dark';d.dataset.theme=n;try{localStorage.setItem('psy-theme',n)}catch(e){}}
function route(){const a=location.hash=='#app';$('#home').hidden=a;$('#app').hidden=!a;if(a){render();if(!S.seen)tut();navigator.storage?.persist?.()}}
try{document.documentElement.dataset.theme=localStorage.getItem('psy-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}
addEventListener('hashchange',route);route();loadShared();

/* inline-обработчики в HTML видят эти имена */
for(const [k,g,s] of [['save',()=>save],['toast',()=>toast],['saveFile',()=>saveFile],['openFile',()=>openFile],['saveTpl',()=>saveTpl],['tplList',()=>tplList],['expTpl',()=>expTpl],['useTpl',()=>useTpl],['delTpl',()=>delTpl],['tut',()=>tut],['endTut',()=>endTut],['side',()=>side],['render',()=>render],['addM',()=>addM],['delM',()=>delM],['setup',()=>setup],['pre',()=>pre],['saveOpts',()=>saveOpts],['bulk',()=>bulk],['data',()=>data],['clearRow',()=>clearRow],['delRow',()=>delRow],['clearCol',()=>clearCol],['clearRows',()=>clearRows],['ingest',()=>ingest],['sheetRows',()=>sheetRows],['decode',()=>decode],['textRows',()=>textRows],['load',()=>load],['paste',()=>paste],['results',()=>results],['exp',()=>exp],['theme',()=>theme],['route',()=>route],['S',()=>S,v=>{S=v}],['PRE',()=>PRE],['mk',()=>mk],['M',()=>M],['$o',()=>$o],['TUT',()=>TUT],['H',()=>H],['TIPS',()=>TIPS],['tips',()=>tips],['cats',()=>cats],['nameOf',()=>nameOf],['m_blank',()=>m_blank],['X',()=>X]])Object.defineProperty(window,k,{get:g,set:s,configurable:true});

/* $ нужен inline-обработчикам: $('#fo').click() и т. п. */
Object.defineProperty(window,'$',{get:()=>$,configurable:true});
Object.defineProperty(window,'useShared',{get:()=>useShared,configurable:true});
Object.defineProperty(window,'expAll',{get:()=>expAll,configurable:true});
