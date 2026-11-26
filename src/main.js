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
 if(d.ms.length&&confirm('ОК — ЗАМЕНИТЬ текущие данные данными из файла.\nОтмена — ДОБАВИТЬ методики и шаблоны из файла к текущим.')){S=d;S.cur=0;S.mode='m';S.seen=1}
 else{const mp={};d.ms.forEach(m=>{const o=m.id;m.id=Date.now()+Math.random();mp[o]=m.id;S.ms.push(m)});S.bat=S.bat||[];(d.bat||[]).forEach(b=>{b.mids=b.mids.map(x=>mp[x]??x);(b.rows||[]).forEach(r=>{const n={};Object.keys(r.a||{}).forEach(k=>n[mp[k]??k]=r.a[k]);r.a=n});S.bat.push(b)});(d.tpl||[]).forEach(t=>{S.tpl=S.tpl.filter(x=>x.name!=t.name);S.tpl.push(t)})}
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
 const grp=(G,arr,mine)=>Object.keys(G).sort().map(c=>`<div class="cat" style="color:var(--hd)">${esc(c)}</div>`+G[c].map(i=>`<div class="row" style="justify-content:space-between"><b>${esc(arr[i].name)}</b><span><button class="o" onclick="${mine?`useTpl(${i})`:`useShared(${i})`}">Создать</button>${mine?` <button class="g" title="Скачать шаблон файлом: передать коллеге или добавить в общую библиотеку" onclick="expTpl(${i})">⬇ Файл</button> <button class="x" title="Удалить шаблон" onclick="delTpl(${i})">✕</button>`:''}</span></div>`).join('')).join('');
 $o('<h2>Шаблоны методик</h2>'+(SH.length?'<h3>🌐 Общая библиотека</h3>'+grp(sg,SH,false):'')+'<h3>★ Мои шаблоны</h3>'+(t.length?grp(g,t,true):'<p>Пока пусто. Настройте методику и нажмите «★ Сохранить как шаблон» на вкладке «Настройка».</p>')+'<div class="row"><button class="g" onclick="$(\'#fo\').click()">📂 Загрузить шаблон из файла</button>'+'<button class="g" onclick="$o(\'\')">Закрыть</button></div>')}
function useShared(i){const c=JSON.parse(JSON.stringify(SH[i]));c.id=Date.now()+Math.random();c.rows=[];S.ms.push(c);S.cur=S.ms.length-1;S.mode='m';S.tab=1;$o('');render()}
function expAll(){const m=new Map();SH.forEach(t=>m.set(t.name,t));(S.tpl||[]).forEach(t=>m.set(t.name,t));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({ms:[],tpl:[...m.values()]},null,1)],{type:'application/json'}));a.download='shared-templates.json';a.click();
 toast('Скачан shared-templates.json — загрузите его в папку public репозитория (с заменой)')}
function expTpl(i){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({ms:[],tpl:[S.tpl[i]]},null,1)],{type:'application/json'}));a.download='шаблон-'+S.tpl[i].name+'.json';a.click()}
function useTpl(i){const c=JSON.parse(JSON.stringify(S.tpl[i]));c.id=Date.now()+Math.random();c.rows=[];S.ms.push(c);S.cur=S.ms.length-1;S.mode='m';S.tab=1;$o('');render()}
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
function side(){const g={},k=m=>m.cat||'Без категории',bo=S.mode=='b';S.ms.forEach((m,i)=>(g[k(m)]=g[k(m)]||[]).push(i));
 $('#list').innerHTML=Object.keys(g).sort().map(c=>`<div class="cat">${esc(c)}</div>`+g[c].map(i=>`<div class="m ${i==S.cur&&!bo?'a':''}" onclick="selM(${i})" style="display:flex;justify-content:space-between"><span>${esc(S.ms[i].name)}</span><span title="Удалить методику" onclick="event.stopPropagation();delM(${i})">✕</span></div>`).join('')).join('')
 +'<div class="cat">Батареи методик</div>'+(S.bat||[]).map((b,i)=>`<div class="m ${bo&&i==S.cb?'a':''}" onclick="selB(${i})" style="display:flex;justify-content:space-between"><span>🗂 ${esc(b.name)}</span><span title="Удалить батарею" onclick="event.stopPropagation();delB(${i})">✕</span></div>`).join('')+'<div class="m" onclick="addB()" style="opacity:.85">+ Новая батарея</div>'+'<div class="cat">Готовые обработки</div><div class="m'+(S.mode=='la'?' a':'')+'" onclick="selLA()">🧪 Тест ЛА (Дворщенко)</div>'}
const cats=()=>[...new Set([...S.ms,...(S.tpl||[])].map(m=>m.cat).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('');
function render(){side();if(S.mode=='la')return renderLA();if(S.mode=='b'&&(S.bat||[])[S.cb])return renderB();
 if(!M()){$('#tabs').innerHTML='';$('#v').innerHTML='<p>Создайте методику слева или выберите «★ Создать из шаблона».</p>';return}
 $('#tabs').innerHTML=['Настройка','Ввод данных','Результаты'].map((t,i)=>`<div class="tab ${i==S.tab?'a':''}" onclick="S.tab=${i};render()">${t}</div>`).join('');
 [setup,data,results][S.tab]();$('#v').insertAdjacentHTML('afterbegin','<div class="hint">'+H[S.tab]+'</div>');tips();save()}
function addM(){const n=prompt('Название методики:');if(!n)return;S.ms.push(mk(n,'1–5',10));S.cur=S.ms.length-1;S.mode='m';S.tab=0;render()}
function delM(i=S.cur){if(confirm('Удалить методику «'+S.ms[i].name+'» вместе с введёнными данными?\n(Настройки можно сохранить как шаблон.)')){const gone=S.ms[i].id;S.ms.splice(i,1);(S.bat||[]).forEach(b=>b.mids=b.mids.filter(x=>x!=gone));S.cur=0;render()}}
function setup(){const m=M();
 $('#v').innerHTML=`<div class="card"><h3>Основное</h3><div class="row">Название <input value="${esc(m.name)}" size="40" onchange="M().name=this.value;side();save()"> Категория <input list="cats" size="20" placeholder="напр. Личность" value="${esc(m.cat||'')}" onchange="M().cat=this.value.trim();side();save()"><datalist id="cats">${cats()}</datalist>
 <button class="g" onclick="saveTpl()">★ Сохранить как шаблон</button> <button class="g" onclick="expCur()" title="Скачать эту методику (без данных испытуемых) файлом шаблона — для загрузки в папку public/templates на GitHub">⬇ Файл шаблона для GitHub</button> <button class="g" onclick="delM()">Удалить методику</button></div></div>
 <div class="card"><h3>Варианты ответов</h3><div class="row">Шаблон: ${Object.keys(PRE).map(k=>`<button class="g" onclick="pre('${k}')">${k}</button>`).join('')}</div>
 <div class="row"><textarea id="op" rows="6" cols="30" oninput="saveOpts()">${m.opts.map(o=>o.l+';'+o.v).join('\n')}</textarea>
 <small>Каждая строка: «подпись;баллы». Сохраняется автоматически.<br>Зеркальный пункт: балл = мин + макс − балл<br>(1↔5, 2↔4, −3↔+3…).</small></div>
 </div>
 <div class="card"><h3>Пункты (вопросы)</h3><div class="row">Количество пунктов: <input type="number" id="nitems" min="1" max="1000" style="width:90px" value="${m.items.length}" onkeydown="if(event.key=='Enter')setN()"> <button class="g" onclick="setN()" title="Добавить или убрать пункты, чтобы их стало ровно столько">Задать</button></div><small>Галочка «зеркальный» — обратный подсчёт для пункта.</small>
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
 <select onchange="M().conv=this.value;save()">${[['none','нет'],['z','z-баллы'],['T','T-баллы'],['sten','стены (1–10)'],['stanine','станайны (1–9)']].map(c=>`<option value="${c[0]}" ${m.conv==c[0]?'selected':''}>${c[1]}</option>`).join('')}</select></div>
 <div class="row" style="margin-top:12px">Показывать в результатах:
 <label><input type="checkbox" ${m.showN!==false?'checked':''} onchange="M().showN=this.checked;save()"> количество учтённых пунктов (n)</label>
 <label><input type="checkbox" ${m.statMean?'checked':''} onchange="M().statMean=this.checked;save()"> среднее по шкале</label>
 <label><input type="checkbox" ${m.statSd?'checked':''} onchange="M().statSd=this.checked;save()"> стандартное отклонение</label></div>
 <small>Среднее и стандартное отклонение считаются по всем испытуемым и выводятся отдельными строками под таблицей (SD — выборочное, с делителем n−1). Среднее по пунктам шкалы для каждого испытуемого даёт формула <code>avg</code>.</small></div>`}
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


function ingest(rows){if(S.mode=='b')return ingestB(rows);const m=M(),nm=m.showName!==false,off=nm?1:0;rows=rows.map(r=>r.map(clean)).filter(r=>r.some(x=>x!==''));
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
function results(){const m=M(),cv=m.conv!='none',C=m.rows.map(r=>calc(m,r));
 $('#v').innerHTML=`<div class="card"><div class="row"><button class="o" onclick="exp()">Выгрузить в Excel</button><small>Пропущенные ответы не учитываются.${sn(m)?' Колонка «n» — число учтённых пунктов.':''}</small></div></div>
 <div class="w"><table><tr><th>${m.showName!==false?'ФИО / код':'№'}</th>${m.scales.map(s=>`<th>${esc(s.name)}</th>${cv?`<th>${esc(s.name)} (${m.conv})</th>`:''}${sn(m)?'<th>n</th>':''}`).join('')}</tr>
 ${m.rows.map((r,y)=>`<tr><td style="padding:5px 8px">${esc(nameOf(m,r,y))}</td>${C[y].map(o=>bCell('<b>'+f2(o.x)+'</b>')+(cv?bCell(f2(o.c)):'')+(sn(m)?bCell('<span style="color:#889">'+o.n+'</span>'):'')).join('')}</tr>`).join('')}${statHtml(statsAoa(m,C))}</table></div>`}
function exp(){const m=M(),cv=m.conv!='none',C=m.rows.map(r=>calc(m,r));
 const h=[m.showName!==false?'ФИО / код':'№',...m.scales.flatMap(s=>[s.name,...(cv?[s.name+' ('+m.conv+')']:[]),...(sn(m)?['n']:[])])];
 const rows=m.rows.map((r,y)=>[nameOf(m,r,y),...C[y].flatMap(o=>[f2(o.x),...(cv?[f2(o.c)]:[]),...(sn(m)?[o.n]:[])])]);
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([h,...rows,...statsAoa(m,C)]),'Результаты');
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

/* ===== Батареи методик: несколько методик одним испытуемым (только function — для hoisting) ===== */
function B(){return (S.bat||[])[S.cb]}
function bm(b){if(!b.ord){b.mids=S.ms.filter(m=>b.mids.includes(m.id)).map(m=>m.id);b.ord=1}return b.mids.map(id=>S.ms.find(m=>m.id==id)).filter(Boolean)}
function bA(b,r,m){return r.a[m.id]||(r.a[m.id]=m.items.map(()=>''))}
function selM(i){S.cur=i;S.mode='m';render()}
function selB(i){S.cb=i;S.mode='b';render()}
function addB(){const n=prompt('Название батареи (например «Профориентация, 9 класс»):');if(!n)return;S.bat=S.bat||[];S.bat.push({name:n,mids:[],rows:[],showName:true});S.cb=S.bat.length-1;S.mode='b';S.tab=0;render()}
function delB(i){if(confirm('Удалить батарею «'+S.bat[i].name+'» вместе с введёнными данными? Сами методики останутся.')){S.bat.splice(i,1);S.cb=0;S.mode='m';render()}}
function togB(i,on){const b=B(),id=S.ms[i].id;b.mids=on?[...b.mids,id]:b.mids.filter(x=>x!=id);render()}
function renderB(){
 $('#tabs').innerHTML=['Состав','Ввод данных','Результаты'].map((t,i)=>`<div class="tab ${i==S.tab?'a':''}" onclick="S.tab=${i};render()">${t}</div>`).join('');
 const t=Math.min(S.tab,2);[bSetup,bData,bResults][t]();
 $('#v').insertAdjacentHTML('afterbegin','<div class="hint">'+['💡 Батарея — набор методик, которые вы проводите одним испытуемым. Отметьте методики; настройки каждой берутся из самой методики. Одиночные методики по-прежнему доступны слева.','💡 Одна строка — один испытуемый, столбцы идут по методикам слева направо. Всю широкую таблицу можно вставить из Excel сразу (Ctrl+V в клетку или «Загрузить из Excel»).','💡 Все шкалы всех методик в одной таблице. «Выгрузить в Excel» создаёт сводный лист и по листу на каждую методику.'][t]+'</div>');
 tips();save()}
function bSetup(){const b=B(),ms=bm(b),rest=S.ms.filter(m=>!b.mids.includes(m.id)),info=m=>`<small>${m.cat?esc(m.cat)+' · ':''}пунктов: ${m.items.length}, шкал: ${m.scales.length}</small>`;
 $('#v').innerHTML=`<div class="card"><h3>Батарея</h3><div class="row">Название <input size="40" value="${esc(b.name)}" onchange="B().name=this.value;side();save()"><button class="g" onclick="delB(S.cb)">Удалить батарею</button></div></div>
 <div class="card"><h3>Методики в батарее</h3><small>Порядок сверху вниз — это порядок столбцов в таблице ввода, в результатах и в файле Excel. Стрелками меняйте методики местами: введённые ответы переезжают вместе с методикой.</small>
 ${ms.length?ms.map((m,k)=>`<div class="row"><b style="width:24px">${k+1}</b><span style="min-width:240px"><b>${esc(m.name)}</b> ${info(m)}</span><button class="g" ${k?'':'disabled'} title="Выше" onclick="moveB(${k},-1)">↑</button><button class="g" ${k<ms.length-1?'':'disabled'} title="Ниже" onclick="moveB(${k},1)">↓</button><button class="x" title="Убрать из батареи (данные сохранятся)" onclick="untB(${k})">✕</button></div>`).join(''):'<p>Пока пусто — добавьте методики ниже.</p>'}</div>
 <div class="card"><h3>Добавить методику</h3>${rest.length?rest.map(m=>`<div class="row"><span style="min-width:240px"><b>${esc(m.name)}</b> ${info(m)}</span><button class="o" onclick="addToB(${S.ms.indexOf(m)})">+ Добавить</button></div>`).join(''):'<p>Все методики уже в батарее (или других методик нет).</p>'}</div>`}
function bData(){const b=B(),ms=bm(b),nm=b.showName!==false;
 if(!ms.length){$('#v').innerHTML='<div class="card">Отметьте методики на вкладке «Состав».</div>';return}
 $('#v').innerHTML=`<div class="card"><div class="row"><button class="o" onclick="B().rows.push({n:'',a:{}});render()">+ Испытуемый</button>
 <button class="g" onclick="$('#fi').click()">Загрузить из Excel / CSV</button><input type="file" id="fi" accept=".xlsx,.xlsm,.xls,.csv,.tsv,.txt,.xml,.html,.htm" hidden onchange="load(this.files[0]);this.value=''">
 <button class="g" onclick="paste()">Вставить из Excel (буфер)</button><button class="g" onclick="clearB()">🗑 Удалить все ответы</button></div>
 <div class="row"><label><input type="checkbox" ${nm?'checked':''} onchange="B().showName=this.checked;render()"> столбец «ФИО / код»</label> Заголовки в файле: <select id="hd"><option value="auto">определять сам</option><option value="1">есть</option><option value="0">нет</option></select></div>
 <small>Порядок столбцов: ${ms.map(m=>esc(m.name)+' ('+m.items.length+')').join(' → ')}.</small></div>
 <div class="w"><table><tr><th rowspan="2"></th><th rowspan="2">${nm?'ФИО / код':'№'}</th>${ms.map(m=>`<th colspan="${m.items.length}">${esc(m.name)}</th>`).join('')}</tr>
 <tr>${ms.map((m,k)=>m.items.map((it,i)=>`<th title="${esc(it.t)}">${i+1}${it.r?'↺':''}<span class="cx" title="Очистить этот столбец у всех" onclick="clearColB(${k},${i})">⌫</span></th>`).join('')).join('')}</tr>
 ${b.rows.map((r,y)=>{let c=0;return`<tr><td style="white-space:nowrap"><button class="x" title="Очистить ответы строки (ФИО останется)" onclick="clearRowB(${y})">⌫</button><button class="x" title="Удалить строку" onclick="B().rows.splice(${y},1);render()">✕</button></td>
 ${nm?`<td><input data-br="${y}" data-bc="-1" placeholder="№ ${y+1}" style="min-width:150px;text-align:left" value="${esc(r.n)}" onchange="B().rows[${y}].n=this.value;save()"></td>`:`<td style="text-align:center;padding:0 8px"><b>${y+1}</b></td>`}
 ${ms.map((m,k)=>m.items.map((_,i)=>{const col=c++;return`<td><input data-br="${y}" data-bc="${col}" value="${esc(bA(b,r,m)[i])}" onchange="bSet(${y},${k},${i},this.value)"></td>`}).join('')).join('')}</tr>`}).join('')}</table></div>`}
function bSet(y,k,i,v){const b=B();bA(b,b.rows[y],bm(b)[k])[i]=v;save()}
function clearRowB(y){const r=B().rows[y];Object.keys(r.a).forEach(k=>r.a[k]=r.a[k].map(()=>''));render()}
function clearColB(k,i){if(confirm('Очистить этот столбец у всех испытуемых?')){const b=B(),m=bm(b)[k];b.rows.forEach(r=>bA(b,r,m)[i]='');render()}}
function clearB(){const b=B();if(!b.rows.length)return toast('Таблица уже пуста');if(confirm('Удалить всех испытуемых и их ответы в батарее «'+b.name+'» ('+b.rows.length+' чел.)? Настройки останутся. Действие нельзя отменить.')){b.rows=[];render();toast('Все ответы удалены')}}
function ingestB(rows){const b=B(),ms=bm(b),nm=b.showName!==false,off=nm?1:0;rows=rows.map(r=>r.map(clean)).filter(r=>r.some(x=>x!==''));
 if(!ms.length)return toast('Сначала отметьте методики на вкладке «Состав»');if(!rows.length)return toast('В файле нет данных');
 const mode=$('#hd')?$('#hd').value:'auto',hdr=mode=='1'||(mode=='auto'&&!rows[0].slice(off).some(c=>ms.some(m=>val(m,c,false)!==null)));
 if(hdr)rows.shift();if(!rows.length)return toast('После заголовков данных нет');
 const total=ms.reduce((s,m)=>s+m.items.length,0),w=Math.max(...rows.map(r=>r.length))-off;
 rows.forEach(r=>{let pos=off;const a={};ms.forEach(m=>{a[m.id]=m.items.map((_,i)=>r[pos+i]||'');pos+=m.items.length});b.rows.push({n:nm?(r[0]||''):'',a})});render();
 toast('Загружено строк: '+rows.length+'. Столбцов с ответами: '+w+', ожидалось (все методики): '+total+(w!=total?' — проверьте порядок и число столбцов!':''))}
function bCalc(b){const ms=bm(b);return b.rows.map(r=>ms.map(m=>calc(m,{a:r.a[m.id]||[]})))}
function bCell(h){return '<td style="padding:5px 8px;text-align:center">'+h+'</td>'}
function bResults(){const b=B(),ms=bm(b),nm=b.showName!==false,C=bCalc(b),cv=m=>m.conv!='none';
 if(!ms.length){$('#v').innerHTML='<div class="card">Отметьте методики на вкладке «Состав».</div>';return}
 $('#v').innerHTML=`<div class="card"><div class="row"><button class="o" onclick="expB()">Выгрузить в Excel</button><small>Пропуски не учитываются.</small></div></div>
 <div class="w"><table><tr><th rowspan="2">${nm?'ФИО / код':'№'}</th>${ms.map(m=>`<th colspan="${cw(m)}">${esc(m.name)}</th>`).join('')}</tr>
 <tr>${ms.map(m=>m.scales.map(s=>`<th>${esc(s.name)}</th>${cv(m)?`<th>${esc(s.name)} (${m.conv})</th>`:''}${sn(m)?'<th>n</th>':''}`).join('')).join('')}</tr>
 ${b.rows.map((r,y)=>`<tr><td style="padding:5px 8px">${esc(nameOf(b,r,y))}</td>${C[y].map((c,k)=>c.map(o=>bCell('<b>'+f2(o.x)+'</b>')+(cv(ms[k])?bCell(f2(o.c)):'')+(sn(ms[k])?bCell('<span style="color:#889">'+o.n+'</span>'):'')).join('')).join('')}</tr>`).join('')}${statHtml(bStats(b,ms,C))}</table></div>`}
function expB(){const b=B(),ms=bm(b),nm=b.showName!==false,C=bCalc(b),cv=m=>m.conv!='none',n0=nm?'ФИО / код':'№';
 const h=[n0,...ms.flatMap(m=>m.scales.flatMap(s=>[m.name+': '+s.name,...(cv(m)?[m.name+': '+s.name+' ('+m.conv+')']:[]),...(sn(m)?[m.name+': '+s.name+' n']:[])]))];
 const rows=b.rows.map((r,y)=>[nameOf(b,r,y),...C[y].flatMap((c,k)=>c.flatMap(o=>[f2(o.x),...(cv(ms[k])?[f2(o.c)]:[]),...(sn(ms[k])?[o.n]:[])]))]);
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([h,...rows,...bStats(b,ms,C)]),'Сводка');
 ms.forEach((m,k)=>{const Ck=C.map(r=>r[k]),hh=[n0,...m.scales.flatMap(s=>[s.name,...(cv(m)?[s.name+' ('+m.conv+')']:[]),...(sn(m)?['n']:[])])],rr=b.rows.map((r,y)=>[nameOf(b,r,y),...Ck[y].flatMap(o=>[f2(o.x),...(cv(m)?[f2(o.c)]:[]),...(sn(m)?[o.n]:[])])]);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([hh,...rr,...statsAoa(m,Ck)]),((k+1)+' '+m.name).replace(/[\\/?*\[\]:]/g,'_').slice(0,31))});
 XLSX.writeFile(wb,b.name.replace(/[\\/:*?"<>|]/g,'_')+'.xlsx')}
document.addEventListener('paste',e=>{const t=e.target;if(!t.dataset||t.dataset.bc===undefined)return;const txt=(e.clipboardData||window.clipboardData).getData('text');
 if(!/[\t\n]/.test(txt.trim()))return;e.preventDefault();const b=B(),ms=bm(b),g=parseDelim(txt),r0=+t.dataset.br,c0=+t.dataset.bc;
 g.forEach((row,dy)=>{const y=r0+dy;while(b.rows.length<=y)b.rows.push({n:'',a:{}});row.forEach((v,dx)=>{const c=c0+dx;v=clean(v);if(c==-1){b.rows[y].n=v;return}let o=c;for(const m of ms){if(o<m.items.length){bA(b,b.rows[y],m)[o]=v;return}o-=m.items.length}})});render();toast('Вставлено строк: '+g.length)});
document.addEventListener('keydown',e=>{const t=e.target;if(e.key=='Enter'&&t.dataset&&t.dataset.bc!==undefined){const n=document.querySelector(`input[data-br="${+t.dataset.br+1}"][data-bc="${t.dataset.bc}"]`);if(n){n.focus();n.select()}}});
S.ms.forEach(m=>{m.id=m.id||Date.now()+Math.random()});
TUT.splice(TUT.length-1,0,['Батарея методик','Если одним испытуемым вы проводите несколько методик, создайте «+ Новая батарея» в списке слева: отметьте методики, вносите ответы одной таблицей (или вставьте широкую таблицу из Excel) и получайте все шкалы всех методик сразу, с выгрузкой в Excel. Отдельные методики по-прежнему можно считать по одной.']);
for(const [k,g] of [['selM',()=>selM],['selB',()=>selB],['addB',()=>addB],['delB',()=>delB],['togB',()=>togB],['bSet',()=>bSet],['clearRowB',()=>clearRowB],['clearColB',()=>clearColB],['clearB',()=>clearB],['expB',()=>expB],['B',()=>B]])Object.defineProperty(window,k,{get:g,configurable:true});

/* ===== число пунктов, n, среднее и SD по шкале ===== */
function sn(m){return m.showN!==false}
function cw(m){return m.scales.length*(1+(m.conv!='none'?1:0)+(sn(m)?1:0))}
function dstat(vals){const v=vals.filter(x=>x!=null&&!isNaN(x)),n=v.length;if(!n)return{n:0,m:null,sd:null};const mu=v.reduce((a,b)=>a+b,0)/n;return{n,m:mu,sd:n>1?Math.sqrt(v.reduce((a,b)=>a+(b-mu)**2,0)/(n-1)):null}}
function sCells(m,C,kind){if(!(kind?m.statSd:m.statMean))return null;const cv=m.conv!='none',f=d=>kind?d.sd:d.m;
 return m.scales.flatMap((s,k)=>[f2(f(dstat(C.map(c=>c[k].x)))),...(cv?[f2(f(dstat(C.map(c=>c[k].c))))]:[]),...(sn(m)?['']:[])])}
function statsAoa(m,C){return [0,1].map(i=>{const c=sCells(m,C,i);return c&&[['Среднее','Станд. отклонение (n−1)'][i],...c]}).filter(Boolean)}
function bStats(b,ms,C){return [0,1].map(i=>{const p=ms.map((m,k)=>sCells(m,C.map(r=>r[k]),i));return p.some(Boolean)?[['Среднее','Станд. отклонение (n−1)'][i],...ms.flatMap((m,k)=>p[k]||Array(cw(m)).fill(''))]:null}).filter(Boolean)}
function statHtml(R){return R.map(r=>'<tr style="background:var(--hint)"><td style="padding:5px 8px"><b>'+r[0]+'</b></td>'+r.slice(1).map(bCell).join('')+'</tr>').join('')}
function setN(){const m=M(),n=Math.max(1,Math.min(1000,parseInt($('#nitems').value)||0)),c=m.items.length;if(n==c)return render();
 if(n<c&&!confirm('Уменьшить число пунктов с '+c+' до '+n+'? Последние пункты и введённые на них ответы будут удалены.'))return render();
 if(n>c){for(let i=c;i<n;i++)m.items.push({t:'Пункт '+(i+1),r:false});m.rows.forEach(r=>{while(r.a.length<n)r.a.push('')})}
 else{m.items.length=n;m.rows.forEach(r=>{r.a.length=Math.min(r.a.length,n)})}
 m.scales.forEach(s=>{if(String(s.it).trim()=='1-'+c)s.it='1-'+n});render();toast('Пунктов: '+n+(m.scales.some(s=>s.it=='1-'+n)?'':'. Проверьте номера пунктов в шкалах'))}
Object.defineProperty(window,'setN',{get:()=>setN,configurable:true});

/* ===== порядок методик в батарее и файл шаблона текущей методики ===== */
function moveB(k,d){const b=B();b.mids=bm(b).map(m=>m.id);const a=b.mids;if(k+d<0||k+d>=a.length)return;[a[k],a[k+d]]=[a[k+d],a[k]];render()}
function untB(k){const b=B();b.mids=bm(b).map(m=>m.id).filter((_,i)=>i!=k);render()}
function addToB(i){const b=B();bm(b);b.mids.push(S.ms[i].id);render()}
function expCur(){const c=JSON.parse(JSON.stringify(M()));c.rows=[];const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([JSON.stringify({ms:[],tpl:[c]},null,1)],{type:'application/json'}));a.download='шаблон-'+c.name.replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();
 toast('Файл шаблона скачан — загрузите его в папку public/templates репозитория')}
for(const [k,g] of [['moveB',()=>moveB],['untB',()=>untB],['addToB',()=>addToB],['expCur',()=>expCur]])Object.defineProperty(window,k,{get:g,configurable:true});

/* ===== выгрузка нескольких методик в один файл ===== */
function expMany(){if(!S.ms.length)return toast('Методик пока нет');
 $o('<h2>Выгрузить методики в файл</h2><p><small>Отметьте методики. Файл с шаблонами можно загрузить в папку public/templates репозитория (общая библиотека) или передать коллеге.</small></p>'
 +S.ms.map((m,i)=>`<div class="row"><label><input type="checkbox" class="xm" value="${i}"> <b>${esc(m.name)}</b></label> <small>${m.cat?esc(m.cat)+' · ':''}пунктов: ${m.items.length}</small></div>`).join('')
 +'<div class="row"><button class="g" onclick="selAllX()">Выбрать все</button></div>'
 +'<div class="row"><label><input type="checkbox" id="xd"> вместе с данными испытуемых</label></div><small>⚠️ Вариант с данными — это резервная копия. Такой файл нельзя загружать в публичный репозиторий.</small>'
 +'<div class="row" style="margin-top:12px"><button class="o" onclick="doExpMany()">⬇ Скачать файл</button><button class="g" onclick="$o(\'\')">Отмена</button></div>')}
function selAllX(){document.querySelectorAll('.xm').forEach(c=>c.checked=true)}
function doExpMany(){const ix=[...document.querySelectorAll('.xm:checked')].map(c=>+c.value);if(!ix.length)return toast('Отметьте хотя бы одну методику');
 const wd=$('#xd').checked,cp=ix.map(i=>JSON.parse(JSON.stringify(S.ms[i])));if(!wd)cp.forEach(c=>c.rows=[]);
 const nm=wd?'методики-с-данными':cp.length==1?'шаблон-'+cp[0].name.replace(/[\\/:*?"<>|]/g,'_'):'шаблоны-методик-'+cp.length;
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(wd?{ms:cp,tpl:[]}:{ms:[],tpl:cp},null,1)],{type:'application/json'}));a.download=nm+'.json';a.click();
 $o('');toast('Выгружено методик: '+cp.length+(wd?'':'. Файл можно загрузить в public/templates'))}
for(const [k,g] of [['expMany',()=>expMany],['selAllX',()=>selAllX],['doExpMany',()=>doExpMany]])Object.defineProperty(window,k,{get:g,configurable:true});
(function(){const s=document.querySelector('aside button[onclick="saveFile()"]');if(s&&!document.getElementById('xmany')){const b=document.createElement('button');b.id='xmany';b.className='g';b.textContent='⬇ Выгрузить методики в файл';b.title='Скачать одну или несколько методик одним файлом';b.setAttribute('onclick','expMany()');s.after(b)}})();

/* ===== Готовые обработки: Тест личностных акцентуаций (ЛА), public/la/index.html ===== */
window.XLSX=XLSX;
function renderLA(){$('#tabs').innerHTML='';$('#v').innerHTML='<iframe id="laf" src="./la/index.html" title="Тест личностных акцентуаций" style="width:100%;height:calc(100vh - 44px);min-height:640px;border:0;border-radius:8px;background:#0a1730"></iframe>';save()}
function selLA(){S.mode='la';render()}
Object.defineProperty(window,'selLA',{get:()=>selLA,configurable:true});
