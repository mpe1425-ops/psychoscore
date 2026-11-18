// Чистая логика подсчёта баллов (без DOM) — покрыта тестами в tests/
export function parseIt(s,n){const o=[];String(s).split(/[,;\s]+/).forEach(p=>{const m=p.match(/^(\d+)-(\d+)$/);
 if(m){for(let i=+m[1];i<=+m[2];i++)o.push(i)}else if(/^\d+$/.test(p))o.push(+p)});return o.filter(i=>i>=1&&i<=n)}
export function val(m,raw,rev){if(raw===''||raw==null)return null;const t=String(raw).trim().toLowerCase();
 const o=m.opts.find(o=>String(o.l).toLowerCase()==t);let v=o?o.v:parseFloat(t.replace(',','.'));if(isNaN(v))return null;
 if(rev){const vs=m.opts.map(o=>o.v);v=Math.min(...vs)+Math.max(...vs)-v}return v}
export function calc(m,r){const iv=m.items.map((it,i)=>val(m,r.a[i],it.r)),out=[];
 m.scales.forEach((s,k)=>{const ids=parseIt(s.it,m.items.length),vs=ids.map(i=>iv[i-1]).filter(v=>v!==null),n=vs.length,sum=vs.reduce((a,b)=>a+b,0),avg=n?sum/n:null;
 let x=null;if(n){if(s.f=='sum')x=sum;else if(s.f=='avg')x=avg;else try{
  if(!/^[\w\s+\-*/().,<>=?:%&|!]*$/.test(s.f))throw 0;
  const nm=['sum','avg','n','Math',...iv.map((_,i)=>'i'+(i+1)),...out.map((_,i)=>'s'+(i+1))];
  x=new Function(...nm,'return ('+s.f+')')(sum,avg,n,Math,...iv,...out.map(o=>o.x))}catch(e){x=NaN}}
 let c=null;const mu=parseFloat(s.m),sd=parseFloat(s.sd);
 if(x!==null&&!isNaN(x)&&m.conv!='none'&&!isNaN(mu)&&sd>0){const z=(x-mu)/sd;
  c=m.conv=='z'?z:m.conv=='T'?50+10*z:m.conv=='sten'?Math.min(10,Math.max(1,Math.round(5.5+2*z))):Math.min(9,Math.max(1,Math.round(5+2*z)))}
 out.push({x,c,n})});return out}
export function parseDelim(t){t=t.replace(/\r\n?/g,'\n');const f=t.split('\n',1)[0],cnt=c=>f.split(c).length,d=['\t',';',','].reduce((b,c)=>cnt(c)>cnt(b)?c:b,'\t');
 const Rw=[];let row=[],c='',q=false;
 for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
  else if(ch=='"'&&c==='')q=true;
  else if(ch==d){row.push(c);c=''}
  else if(ch=='\n'){row.push(c);Rw.push(row);row=[];c=''}
  else c+=ch}
 row.push(c);Rw.push(row);while(Rw.length&&Rw[Rw.length-1].every(x=>x.trim()===''))Rw.pop();return Rw}
export const f2=x=>x==null?'':isNaN(x)?'ошибка':Math.round(x*100)/100;
export const clean=c=>String(c??'').replace(/\u00a0/g,' ').trim();
