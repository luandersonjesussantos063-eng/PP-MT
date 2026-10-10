import {loadMembership,runPremiumPractice} from '../auth.js?v=2.15.0';
import {PLAN} from './plan.js?v=2.15.0-comercial1';

export async function renderMembership(container){
 container.innerHTML=`
 <div class="plan-presentation">
  <section class="plan-hero">
   <p class="plan-kicker">PREPARAÇÃO POLICIAL · PP-MT</p>
   <h1>Seu plano de <em>evolução.</em></h1>
   <p>Estude gratuitamente para conhecer a plataforma ou assuma o comando da <strong>Central Tática Premium</strong>, com questões exclusivas e missões direcionadas aos seus pontos fracos.</p>
   <div id="membershipStatus" role="status" class="plan-current">Verificando situação da sua conta…</div>
   <div class="plan-hero-actions">
    <a class="button primary" href="./planos/premium.html">Entrar na Central Tática →</a>
    <a class="button secondary" href="./planos/assinar.html">Gerenciar assinatura</a>
   </div>
  </section>
  <div class="plan-tier-grid">
   <section class="plan-tier plan-free">
    <div class="plan-tier-head"><span>PLANO DE ENTRADA</span><h2>Grátis</h2><div class="plan-price">R$ 0</div><p>Conheça o método e mantenha seus estudos em movimento.</p></div>
    <ul>
     <li>Questões e provas históricas do acervo público</li>
     <li>Correção das questões gratuitas</li>
     <li><strong>Até 20 questões por dia</strong> nas atividades grátis</li><li><strong>1 simulado por semana</strong> com cota reservada ao iniciar</li><li>Treino livre e revisão dentro da cota diária</li>
     <li>Progresso básico e rotina de estudos</li>
     <li>Notícias e acompanhamento do concurso</li>
    </ul>
    <a href="#inicio" class="button secondary">Continuar no grátis →</a>
   </section>
   <section class="plan-tier plan-paid">
    <span class="plan-exclusive">OPERAÇÃO ELITE · PREMIUM</span>
    <div class="plan-tier-head"><h2>Central Tática</h2><div class="plan-price">${PLAN.price} <small>/mês</small></div>
     <p>Recursos exclusivos para descobrir onde está errando e treinar com estratégia.</p></div>
    <ul>
     <li><strong>Banco exclusivo</strong> de questões autorais comentadas, protegido no servidor</li>
     <li><strong>5 missões</strong>: misto, inéditas, recuperação de erros, pontos fracos e matérias</li>
     <li><strong>Inteligência por disciplina</strong>: taxa de acerto e dificuldades</li>
     <li><strong>Revisão automática</strong> das questões cuja última tentativa foi incorreta</li>
     <li><strong>Novas questões</strong> incorporadas ao banco ao longo do desenvolvimento</li>
     <li><strong>Questões e simulados sem as cotas do Grátis</strong></li><li>Todos os recursos do plano grátis continuam disponíveis</li>
    </ul>
    <a href="./planos/assinar.html" class="button primary">Assinar por ${PLAN.price}/mês →</a>
    <a href="./planos/premium.html" class="plan-secondary-link">Conhecer a Central Tática →</a>
   </section>
  </div>
  <p class="plan-fineprint">O Premium não garante aprovação em concurso. A assinatura é mensal: no cartão, a renovação é automática até o cancelamento; Pix, boleto e débito exigem pagamento manual. Consulte os termos no portal. Seu acesso é confirmado pelo servidor.</p>
 </div>`;
 const status=container.querySelector('#membershipStatus');
 try{
  const member=await loadMembership();
  if(!status.isConnected)return;
  if(member?.premium){
   status.textContent='✓ Premium mensal ativo até '+new Date(member.current_period_end).toLocaleDateString('pt-BR')+'.';
   status.classList.add('is-active');
   return;
  }
  try{
   const trial=await runPremiumPractice('status');
   if(!status.isConnected)return;
   if(trial?.premium){
    status.textContent='✓ Acesso Premium de teste ativo até '+new Date(trial.current_period_end).toLocaleDateString('pt-BR')+'.';
    status.classList.add('is-active');
    return;
   }
  }catch{}
  status.textContent='Plano gratuito ativo · o Premium é opcional.';
 }catch{
  if(status.isConnected)status.textContent='Não foi possível consultar a assinatura. Conecte-se à internet para conferir.';
 }
}
