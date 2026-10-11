// Conteúdo exclusivo do pacote das lojas: nenhuma cobrança ou link para checkout.
import {loadMembership} from '../auth.js?v=2.15.0';
export async function renderMembership(container){
 container.innerHTML=`<div class="plan-presentation"><section class="plan-hero">
 <p class="plan-kicker">PREPARAÇÃO POLICIAL · PP-MT</p><h1>Seu plano de estudos</h1>
 <p>Resolva questões, revise os erros, acompanhe seu desempenho e mantenha uma rotina de preparação.</p>
 <p id="membershipStatus" class="plan-current" role="status">Conferindo seu acesso…</p>
 <div class="plan-hero-actions"><a class="button primary" href="#inicio">Continuar estudando →</a>
 <a class="button secondary" href="./planos/premium.html">Central Tática Premium</a></div>
 </section><div class="plan-tier-grid"><section class="plan-tier plan-free">
 <div class="plan-tier-head"><h2>Estudo gratuito</h2><p>Questões, simulados, revisões e desempenho de acordo com as cotas do plano.</p></div>
 </section><section class="plan-tier plan-paid"><div class="plan-tier-head"><h2>Meu acesso Premium</h2>
 <p>Se sua conta já possui acesso válido, os recursos exclusivos são reconhecidos automaticamente pelo servidor.</p>
 <p>A contratação de conteúdo digital não está disponível nesta versão do aplicativo.</p></div>
 <a class="button secondary" href="./planos/premium.html">Consultar recursos exclusivos</a></section></div>
 <p class="plan-fineprint">PP-MT é independente e não representa órgão público. Acesso Premium validado no servidor.</p></div>`;
 const status=container.querySelector('#membershipStatus');
 try{const m=await loadMembership();if(!status.isConnected)return;
 status.textContent=m?.premium?'✓ Premium ativo até '+new Date(m.current_period_end).toLocaleDateString('pt-BR'):'✓ Plano gratuito ativo';}
 catch{if(status.isConnected)status.textContent='Entre na sua conta ou conecte-se à internet para consultar o plano.';}
}
