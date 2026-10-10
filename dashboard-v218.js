// PP-MT 2.18.0 | dashboard é apenas apresentação; permissões continuam no Supabase.
const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(n,d)=>d>0?Math.min(100,Math.max(0,Math.round(n/d*100))):0;
export function commandDashboard({
 date=new Date(),seconds=0,goalSeconds=0,streak=0,xp=0,rank='Recruta',
 pending=0,completed=0,done=false,mission='',quota=null
}={}){
 const minutes=Math.floor(Math.max(0,seconds)/60),goalMin=Math.ceil(Math.max(0,goalSeconds)/60),progress=pct(seconds,goalSeconds);
 const stamp=new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Cuiaba'}).format(date);
 const premium=quota?.premium===true;
 const remaining=Number.isFinite(Number(quota?.daily_remaining))?Math.max(0,Number(quota.daily_remaining)):null;
 const tagline=done?'Meta de tempo alcançada. Continue se quiser fortalecer a preparação.':'A próxima evolução começa no seu treino de hoje.';
 const missionLabel=mission?String(mission):'Preparação direcionada à Polícia Penal de MT';
 return `<section class="command-v218" aria-labelledby="command-title">
  <div class="command-main">
   <div class="command-intro">
    <div class="command-kicker"><span class="command-kicker-dot"></span> CENTRAL DE COMANDO / PP-MT</div>
    <p class="command-date">${safe(stamp)}</p>
    <h1 id="command-title">Operação <em>Aprovação.</em></h1>
    <p class="command-description">${safe(tagline)}</p>
    <div class="command-buttons">
     <a href="#missao" class="command-primary">INICIAR MISSÃO <span aria-hidden="true">→</span></a>
     <a href="./planos/premium.html" class="command-secondary">CENTRAL TÁTICA PREMIUM <span aria-hidden="true">↗</span></a>
    </div>
   </div>
   <div class="command-insignia" aria-hidden="true"><div class="command-insignia-ring"><img src="./icon.svg" alt=""></div><span>DISCIPLINA · HONRA · FOCO</span></div>
  </div>
  <div class="command-footer"><span>${premium?'✦ ACESSO PREMIUM ATIVO':'◈ PREPARAÇÃO POLICIAL'}</span><span>◈ MISSÕES DIÁRIAS</span><span>◈ EVOLUÇÃO CONTÍNUA</span></div>
 </section>
 <section class="command-metrics" aria-label="Seu desempenho até agora">
  <div class="command-metric"><span class="command-metric-ico" aria-hidden="true">◷</span><small>TEMPO ESTUDADO HOJE</small><strong data-study-time>${safe(String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds%3600/60)).padStart(2,'0')+':'+String(Math.floor(seconds%60)).padStart(2,'0'))}</strong><span>Meta: ${goalMin?goalMin+' min':'descanso ou estudo livre'}</span></div>
  <div class="command-metric"><span class="command-metric-ico" aria-hidden="true">↗</span><small>SEQUÊNCIA ATUAL</small><strong>${safe(streak)} ${streak===1?'dia':'dias'}</strong><span>Constância na preparação</span></div>
  <div class="command-metric"><span class="command-metric-ico" aria-hidden="true">✦</span><small>EXPERIÊNCIA</small><strong>${safe(xp)} XP</strong><span>Patente: ${safe(rank)}</span></div>
  <div class="command-metric"><span class="command-metric-ico" aria-hidden="true">↺</span><small>REVISÕES PENDENTES</small><strong>${safe(pending)}</strong><span>${pending===0?'Tudo em dia':'Pontos para reforçar'}</span></div>
 </section>
 <section class="command-quick"><div class="command-quick-heading"><div><small>ACESSO RÁPIDO</small><h2>Qual sua próxima missão?</h2></div><span>Escolha seu foco →</span></div>
  <div class="command-quick-grid">
   <a class="command-shortcut" href="#estudar"><span class="command-shortcut-icon">▦</span><b>Estudo guiado</b><small>Plano inteligente para hoje</small><span class="command-shortcut-arrow">↗</span></a>
   <a class="command-shortcut" href="#erros"><span class="command-shortcut-icon">↺</span><b>Revisar erros</b><small>${safe(pending)} ${pending===1?'revisão pendente':'revisões pendentes'}</small><span class="command-shortcut-arrow">↗</span></a>
   <a class="command-shortcut" href="#simulados"><span class="command-shortcut-icon">◷</span><b>Simulados</b><small>Teste seu desempenho</small><span class="command-shortcut-arrow">↗</span></a>
   <a class="command-shortcut command-shortcut-gold" href="./planos/premium.html"><span class="command-shortcut-icon">✦</span><b>Central Tática</b><small>Treinos avançados Premium</small><span class="command-shortcut-arrow">↗</span></a>
  </div>
 </section>`;
}
