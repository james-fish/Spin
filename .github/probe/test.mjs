
const vals={q_radio:'talk',q_archive:'',q_commons:'chant'};
globalThis.$=id=>({value:vals[id]||'',checked:true});
const document={createElement:()=>({canPlayType:()=>'' ,set innerHTML(v){this.value=v}})};
const location={protocol:'https:'};
const WORDS=['rain','night','voice','choir','sea','city','market','prayer','train','wind','bells','speech','radio','forest','storm','machine','birds','drums','church','harbor','interview','lecture','poem','street','festival','organ','crowd','engine','water','song'];
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const terms=t=>String(t||'').split(',').map(x=>x.trim()).filter(Boolean);
const term=t=>rnd(terms(t).length?terms(t):WORDS);
const getJ=async u=>{const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()};
const canOgg=document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"')!=='';
const strip=h=>String(h||'').replace(/<[^>]*>/g,'').trim();
const CFG_IDS=['c_locus','c_radio','c_archive','c_commons','c_fs','c_yt','c_custom','q_radio','q_archive','q_commons','q_fs','k_fs','q_yt','k_yt','custom'];
let locusList=[];

function loadCfg(){
  let c={};try{c=JSON.parse(localStorage.getItem('spin_cfg')||'{}')}catch(e){}
  if(!('c_locus' in c))c={c_locus:true,c_custom:true,custom:(()=>{try{return localStorage.getItem('kwel_custom')||''}catch(e){return ''}})()};
  for(const id of CFG_IDS){const el=$(id);if(el.type==='checkbox')el.checked=!!c[id];else el.value=c[id]||''}
}
function saveCfg(){
  const c={};for(const id of CFG_IDS){const el=$(id);c[id]=el.type==='checkbox'?el.checked:el.value}
  try{localStorage.setItem('spin_cfg',JSON.stringify(c))}catch(e){}
}
async function loadLocus(){
  try{
    const j=await getJ('https://locusonus.org/soundmap/list/');
    const secure=location.protocol==='https:';
    locusList=j.filter(s=>s.url&&(!secure||s.url.startsWith('https:'))&&(canOgg||s.ext!=='ogg')).map(s=>({
      name:s.name+(s.country?' ('+s.country+')':''),url:s.url,kind:'live',link:'https://locusonus.org/soundmap/',
      credit:'Locus Sonus open mic'+(s.artist?' by '+s.artist:''),license:'Locus Sonus asks for a credit'}));
  }catch(e){locusList=[]}
  $('srccount').textContent=locusList.length?`${locusList.length} Locus Sonus mics online`:'Locus Sonus list unavailable';
}
function customList(){
  return $('custom').value.split('\n').map(l=>l.split('|').map(x=>x.trim())).filter(p=>p[1]&&/^https?:/.test(p[1]))
    .map(p=>({name:p[0]||p[1],url:p[1],kind:'live',license:p[2]||'no license info',credit:'My stream'}));
}
const PROVIDERS={
  c_locus:async()=>{if(!locusList.length)await loadLocus();if(!locusList.length)throw new Error('Locus Sonus list unavailable');return rnd(locusList)},
  c_custom:async()=>{const l=customList();if(!l.length)throw new Error('No streams under My streams');return rnd(l)},
  c_radio:async()=>{
    const t=terms($('q_radio').value);const p=new URLSearchParams({limit:60,hidebroken:'true',is_https:'true',order:'random'});
    if(t.length)p.set('tag',rnd(t).toLowerCase());
    const j=(await getJ('https://de1.api.radio-browser.info/json/stations/search?'+p)).filter(x=>(x.url_resolved||'').startsWith('https:'));
    if(!j.length)throw new Error('No https stations for that tag');const s=rnd(j);
    return {name:s.name.trim()+(s.countrycode?' ('+s.countrycode+')':''),url:s.url_resolved,kind:'live',link:s.homepage||'',
      credit:'Radio station'+(s.tags?' · '+s.tags.split(',').slice(0,4).join(', '):''),license:'Broadcast'};
  },
  c_archive:async()=>{
    const q=`(${$('q_archive').value.trim()||'collection:oldtimeradio'}) AND mediatype:audio`;
    const base='https://archive.org/advancedsearch.php?output=json&fl[]=identifier&rows=1&q='+encodeURIComponent(q);
    const n=(await getJ(base+'&page=1')).response.numFound;if(!n)throw new Error('Archive search found nothing');
    const id=(await getJ(base+'&page='+(1+Math.floor(Math.random()*Math.min(n,9000))))).response.docs[0].identifier;
    const m=await getJ('https://archive.org/metadata/'+encodeURIComponent(id));
    const files=(m.files||[]).filter(f=>/\.mp3$/i.test(f.name));if(!files.length)throw new Error('No mp3 in '+id);
    const f=rnd(files);
    return {name:(m.metadata.title||id)+(files.length>1?' · '+(f.title||f.name):''),url:`https://archive.org/download/${encodeURIComponent(id)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
      kind:'file',link:'https://archive.org/details/'+id,credit:'Internet Archive'+(m.metadata.creator?' · '+[].concat(m.metadata.creator)[0]:''),
      license:m.metadata.licenseurl?(/publicdomain|zero/.test(m.metadata.licenseurl)?'Public domain / CC0':'CC: '+m.metadata.licenseurl.split('licenses/')[1]):'Archive item, rights vary'};
  },
  c_commons:async()=>{
    const u='https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=50&gsrsearch='+
      encodeURIComponent('filetype:audio '+term($('q_commons').value))+'&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime';
    const pages=Object.values((await getJ(u)).query?.pages||{});if(!pages.length)throw new Error('Commons found nothing');
    const p=rnd(pages),ii=p.imageinfo[0],em=ii.extmetadata||{};let url=ii.url.split('?')[0];
    if(/ogg|opus|webm/.test(ii.mime)&&!canOgg){const m=url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/)(\w\/\w\w\/)([^/]+)$/);if(m)url=m[1]+'transcoded/'+m[2]+m[3]+'/'+m[3]+'.mp3'}
    return {name:p.title.replace(/^File:/,''),url,kind:'file',link:ii.descriptionurl,credit:'Wikimedia Commons'+(em.Artist?' · '+strip(em.Artist.value).slice(0,60):''),
      license:em.LicenseShortName?em.LicenseShortName.value:'Free license'};
  },
  c_fs:async()=>{
    const k=$('k_fs').value.trim();if(!k)throw new Error('Freesound needs an API key');
    const p=new URLSearchParams({query:term($('q_fs').value),filter:'license:"Creative Commons 0" duration:[3 TO 900]',fields:'id,name,username,previews,url',page_size:50,token:k});
    const r=(await getJ('https://freesound.org/apiv2/search/text/?'+p)).results||[];if(!r.length)throw new Error('Freesound found nothing');
    const s=rnd(r);
    return {name:s.name,url:s.previews['preview-hq-mp3'],kind:'file',link:s.url,credit:'Freesound · '+s.username,license:'CC0'};
  },
  c_yt:async()=>{
    const k=$('k_yt').value.trim();if(!k)throw new Error('YouTube needs an API key');
    const p=new URLSearchParams({part:'snippet',type:'video',videoLicense:'creativeCommon',videoEmbeddable:'true',maxResults:50,q:term($('q_yt').value),key:k});
    const items=(await getJ('https://www.googleapis.com/youtube/v3/search?'+p)).items||[];if(!items.length)throw new Error('YouTube found nothing');
    const v=rnd(items),id=v.id.videoId;
    const d=(await getJ(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${id}&key=${encodeURIComponent(k)}`)).items?.[0]?.contentDetails?.duration||'';
    const m=d.match(/(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)||[];const dur=(+m[1]||0)*3600+(+m[2]||0)*60+(+m[3]||0);
    const start=Math.floor(Math.random()*Math.max(0,dur-30));
    const txt=document.createElement('textarea');txt.innerHTML=v.snippet.title;
    return {name:txt.value,id,start,kind:'youtube',link:`https://youtu.be/${id}?t=${start}`,credit:'YouTube · '+v.snippet.channelTitle,license:'Creative Commons (YouTube: CC BY)'};
  }
};

(async()=>{
 for(const k of ['c_locus','c_radio','c_archive','c_commons']){
  for(let i=0;i<3;i++){
   try{const s=await PROVIDERS[k]();
     const r=await fetch(s.url,{headers:{Origin:'https://james.fish',Range:'bytes=0-1000'},signal:AbortSignal.timeout(8000)}).catch(e=>({status:'ERR '+e.message,headers:new Map()}));
     console.log(k,'|',r.status,'| cors:',r.headers.get&&r.headers.get('access-control-allow-origin'),'|',s.name.slice(0,50),'|',s.license,'|',s.url.slice(0,90));
     try{r.body&&r.body.cancel()}catch(e){}
   }catch(e){console.log(k,'ERROR',e.message)}
  }
 }
 process.exit(0);
})();
