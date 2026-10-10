import {loadMembership} from '../auth.js?v=2.13.0';
import {PLAN} from './plan.js';
export async function renderMembership(container){
 container.innerHTML=`<div class="eyebrow">PPMT PREMIUM</div><h1>Meu plano</h1><section class="card"><h2>Acesso de lançamento</h2><p>Você pode continuar estudando gratuitamente enquanto preparamos as assinaturas.</p><p id="membershipStatus" role="status">Consultando sua conta…</p><p><strong>${PLAN.price}/mês</strong> · Plano previsto para o lançamento.</p><p>As vendas ainda não estão abertas. Nenhum valor será cobrado agora.</p><a class="button primary" href="./planos/">Conhecer o Premium →</a> <a class="button secondary" href="#inicio">Continuar estudando</a></section>`;
 const status=container.querySelector('#membershipStatus');
 try{
  const member=await loadMembership();
  if(!status.isConnected)return;
  if(member?.premium){status.textContent='Assinatura ativa até '+new Date(member.current_period_end).toLocaleDateString('pt-BR')+'.';}
  else status.textContent='Sua conta não possui assinatura paga ativa.';
 }catch{if(status.isConnected)status.textContent='Não foi possível consultar a assinatura. Reconecte-se e abra esta tela novamente. O estudo gratuito continua disponível.';}
}
