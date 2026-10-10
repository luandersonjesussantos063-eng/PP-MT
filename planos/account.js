import {loadMembership} from '../auth.js?v=2.15.0';
import {PLAN} from './plan.js?v=2.15.0-comercial1';
export async function renderMembership(container){
 container.innerHTML=`<div class="eyebrow">PPMT PREMIUM</div><h1>Meu plano</h1><section class="card"><h2>Seu acesso PP-MT</h2><p>Continue estudando gratuitamente ou ative o Premium com questões exclusivas comentadas.</p><p id="membershipStatus" role="status">Consultando sua conta…</p><p><strong>${PLAN.price}/mês</strong> · Valor mensal do Premium.</p><p>Assinaturas disponíveis: cartão com renovação automática ou pagamento mensal avulso pelas formas oferecidas no Mercado Pago. O Premium é liberado após o pagamento confirmado.</p><a class="button primary" href="./planos/assinar.html">Assinar Premium →</a> <a class="button secondary" href="./planos/premium.html">Treino Premium exclusivo →</a> <a class="button secondary" href="#inicio">Continuar estudando</a></section>`;
 const status=container.querySelector('#membershipStatus');
 try{
  const member=await loadMembership();
  if(!status.isConnected)return;
  if(member?.premium){status.textContent='Assinatura ativa até '+new Date(member.current_period_end).toLocaleDateString('pt-BR')+'.';}
  else status.textContent='Sua conta não possui assinatura paga ativa.';
 }catch{if(status.isConnected)status.textContent='Não foi possível consultar a assinatura. Reconecte-se e abra esta tela novamente. O estudo gratuito continua disponível.';}
}
