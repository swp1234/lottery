(function(){
  const STORAGE_KEY='lottery_saved_v2';
  const tracked=new Set();
  function track(name,detail){if(tracked.has(name))return;tracked.add(name);if(typeof gtag==='function')gtag('event',name,Object.assign({event_category:'lottery_random',app_language:i18n.getCurrentLanguage()},detail||{}))}
  function validSet(value){return Array.isArray(value)&&value.length===6&&new Set(value).size===6&&value.every(n=>Number.isInteger(n)&&n>=1&&n<=45)}

  class LotteryRandomApp{
    constructor(){this.fixed=[];this.results=[];this.saved=this.loadSaved();this.bind();this.buildPicker();this.renderSaved();this.observeQualifiedView()}
    bind(){
      document.getElementById('languageSelect').addEventListener('change',e=>i18n.setLanguage(e.target.value));
      document.getElementById('autoMode').addEventListener('change',e=>{document.getElementById('picker').hidden=!e.target.checked;if(!e.target.checked){this.fixed=[];this.updatePicker()}});
      document.getElementById('generateBtn').addEventListener('click',()=>this.generate());
      document.getElementById('clearSavedBtn').addEventListener('click',()=>{this.saved=[];this.persist();this.renderSaved();this.renderResults()});
      document.getElementById('shareBtn').addEventListener('click',()=>this.share());
      document.querySelectorAll('.related-grid a').forEach(link=>link.addEventListener('click',()=>track('lottery_random_related_click',{target_slug:link.dataset.targetSlug})));
      document.addEventListener('lotterylanguagechange',()=>{this.renderResults();this.renderSaved()});
    }
    observeQualifiedView(){const panel=document.querySelector('.qualified-generator');let timer=null;const observer=new IntersectionObserver(entries=>{const visible=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.5);if(visible&&!timer)timer=setTimeout(()=>{track('lottery_random_view');observer.disconnect();timer=null},500);if(!visible&&timer){clearTimeout(timer);timer=null}},{threshold:[0,.5,1]});if(panel)observer.observe(panel)}
    buildPicker(){const container=document.getElementById('numberPicker');for(let n=1;n<=45;n++){const button=document.createElement('button');button.type='button';button.className='pick-number';button.textContent=String(n);button.dataset.number=String(n);button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>this.toggleFixed(n));container.appendChild(button)}}
    toggleFixed(number){const index=this.fixed.indexOf(number);if(index>=0)this.fixed.splice(index,1);else if(this.fixed.length<5)this.fixed.push(number);this.fixed.sort((a,b)=>a-b);this.updatePicker()}
    updatePicker(){document.querySelectorAll('.pick-number').forEach(button=>button.setAttribute('aria-pressed',String(this.fixed.includes(Number(button.dataset.number)))));document.getElementById('selectedDisplay').textContent=this.fixed.length?this.fixed.join(', '):i18n.t('semiAuto.none')}
    randomInt(max){if(!globalThis.crypto||typeof crypto.getRandomValues!=='function')throw Error('secure-random-unavailable');const range=0x100000000,limit=range-(range%max),value=new Uint32Array(1);do{crypto.getRandomValues(value)}while(value[0]>=limit);return value[0]%max}
    createSet(){const pool=[];for(let n=1;n<=45;n++)if(!this.fixed.includes(n))pool.push(n);const needed=6-this.fixed.length,picked=[...this.fixed];for(let i=0;i<needed;i++){const j=i+this.randomInt(pool.length-i);[pool[i],pool[j]]=[pool[j],pool[i]];picked.push(pool[i])}return picked.sort((a,b)=>a-b)}
    generate(){const error=document.getElementById('errorMessage');error.hidden=true;try{const count=Number(document.getElementById('setCount').value);this.results=Array.from({length:count},()=>this.createSet());this.renderResults();document.getElementById('shareBtn').hidden=false;track('lottery_random_generate');document.getElementById('resultsSection').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}catch(e){error.textContent=i18n.safe('cryptoError');error.hidden=false}}
    renderResults(){const container=document.getElementById('resultsContainer');if(!this.results.length){container.innerHTML='';const empty=document.createElement('p');empty.className='empty';empty.textContent=i18n.t('generate.empty');container.appendChild(empty);return}container.innerHTML='';this.results.forEach(numbers=>{const row=document.createElement('div');row.className='result-row';row.appendChild(this.balls(numbers));const button=document.createElement('button');button.type='button';button.className='save';const isSaved=this.saved.some(set=>set.join(',')===numbers.join(','));button.dataset.saved=String(isSaved);button.textContent=isSaved?i18n.t('buttons.saved'):i18n.t('buttons.save');button.addEventListener('click',()=>this.save(numbers));row.appendChild(button);container.appendChild(row)})}
    balls(numbers){const wrap=document.createElement('div');wrap.className='balls';numbers.forEach(number=>{const ball=document.createElement('span');ball.className='ball';ball.textContent=String(number);wrap.appendChild(ball)});return wrap}
    save(numbers){if(!this.saved.some(set=>set.join(',')===numbers.join(','))){this.saved.unshift([...numbers]);this.saved=this.saved.slice(0,24);this.persist();track('lottery_random_save')}this.renderResults();this.renderSaved()}
    remove(index){this.saved.splice(index,1);this.persist();this.renderSaved();this.renderResults()}
    renderSaved(){const container=document.getElementById('savedContainer');container.innerHTML='';if(!this.saved.length){const empty=document.createElement('p');empty.className='empty';empty.textContent=i18n.t('saved.empty');container.appendChild(empty);return}this.saved.forEach((numbers,index)=>{const row=document.createElement('div');row.className='saved-row';row.appendChild(this.balls(numbers));const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label',i18n.safe('remove'));remove.addEventListener('click',()=>this.remove(index));row.appendChild(remove);container.appendChild(row)})}
    loadSaved(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value.filter(validSet).slice(0,24):[]}catch(e){return[]}}
    persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.saved))}catch(e){}}
    async share(){const data={title:i18n.safe('title'),text:i18n.safe('shareText'),url:'https://dopabrain.com/lottery/'};try{if(navigator.share)await navigator.share(data);else await navigator.clipboard.writeText(data.text+'\n'+data.url);track('lottery_random_share');const button=document.getElementById('shareBtn'),before=button.textContent;button.textContent=i18n.t('share.copied');setTimeout(()=>button.textContent=before,1800)}catch(e){if(e&&e.name!=='AbortError')document.getElementById('errorMessage').textContent=String(e.message||e)}}
  }

  i18n.init().then(()=>{window.lotteryApp=new LotteryRandomApp();document.getElementById('app-loader').hidden=true});
  if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/lottery/sw.js',{scope:'/lottery/'}).catch(()=>{}));
})();
