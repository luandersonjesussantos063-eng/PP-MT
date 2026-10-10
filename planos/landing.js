import {PLAN} from './plan.js';
document.querySelectorAll('[data-price]').forEach(el=>el.textContent=PLAN.price);
const choices=[...document.querySelectorAll('[data-value]')],feedback=document.querySelector('#feedback'),retry=document.querySelector('#retry');
choices.forEach(button=>button.addEventListener('click',()=>{
 const correct=button.dataset.value==='48';
 choices.forEach(b=>{b.disabled=true;if(b.dataset.value==='48')b.classList.add('correct');});
 if(!correct)button.classList.add('wrong');
 feedback.hidden=false;
 feedback.textContent=(correct?'Resposta correta! ':'A resposta correta é C: 48. ')+'O padrão é multiplicar por 2: 24 × 2 = 48. Identificar a regra é mais útil que memorizar o resultado.';
 retry.hidden=false;
}));
retry.addEventListener('click',()=>{choices.forEach(b=>{b.disabled=false;b.classList.remove('correct','wrong')});feedback.hidden=true;retry.hidden=true;choices[0].focus()});
