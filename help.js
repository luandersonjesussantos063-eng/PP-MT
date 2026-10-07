const STOP=new Set('a o os as um uma de da do das dos e ou em no na nos nas por para com sem que se ao aos é são foi ser como mais menos sua seu suas seus esta este esse essa isto isso onde qual quais quando entre sobre apenas ainda muito pela pelo pelos pelas'.split(' '));

function words(text){
  return String(text||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{4,}/g)?.filter(w=>!STOP.has(w))||[];
}

export function questionCommand(q){
  const text=String(q?.statement||'');
  const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const patterns=/(assinale|está correto|esta correto|correta|incorreta|exceto|marque|indique|julgue|considere|é correto|e correto|é incorreto|e incorreto)/i;
  const command=[...lines].reverse().find(x=>patterns.test(x))||lines.at(-1)||text;
  const assertions=/\bI\.|\bII\.|\bIII\.|\bIV\./.test(text);
  const tip=assertions?'Analise cada afirmativa separadamente como verdadeira ou falsa. Só depois compare sua combinação com as alternativas.':'Descubra primeiro exatamente o que o comando está pedindo e elimine alternativas que respondem outra coisa.';
  return {command,tip};
}

export function trapWords(q){
  const found=[];
  const text=String(q?.statement||'').toLocaleLowerCase('pt-BR');
  for(const w of ['exceto','incorreta','correta','apenas','somente','sempre','nunca','todos','todas','nenhum','nenhuma','obrigatoriamente','exclusivamente']){
    if(text.includes(w)) found.push(w);
  }
  return [...new Set(found)];
}

export function microLesson(q){
  const text=(String(q?.statement||'')+' '+String(q?.subject||'')).toLocaleLowerCase('pt-BR');
  const lessons=[
    [/diagnóstico estratégico externo|diagnostico estrategico externo|rastreamento|mapeamento ambiental/,
      '<b>Diagnóstico estratégico externo em 60s:</b> pense em uma sequência: <b>rastreamento</b> identifica sinais e tendências; <b>monitoramento</b> acompanha esses sinais ao longo do tempo; <b>previsão</b> projeta possíveis desdobramentos futuros; <b>avaliação</b> mede o impacto provável dessas mudanças para a organização. Se a alternativa troca “previsão” por análise contínua do presente, desconfie.'],
    [/retroaliment|processador|parâmetros de sistemas|parametros de sistemas/,
      '<b>Teoria de sistemas em 60s:</b> entrada é o que o sistema recebe; processamento é a transformação das entradas; saída é o resultado; retroalimentação (feedback) compara o resultado com o objetivo/padrão e devolve informação para correção. Cuidado: processador é o mecanismo que transforma entradas em saídas — não simplesmente “o modo como elementos interagem”.'],
    [/embora|concessiv/,
      '<b>Concessão em 60s:</b> uma oração concessiva admite um fato que poderia dificultar outro, mas não o impede. Palavras comuns: “embora”, “ainda que”, “mesmo que”. Pergunte: “isso cria uma oposição que não impede o fato principal?”'],
    [/pronome oblíquo|pronome obliquo|chama ela/,
      '<b>Pronomes em 60s:</b> em norma-padrão, pronomes oblíquos átonos exercem funções de complemento. Para objeto direto, pense em “o, a, os, as”; para objeto indireto, “lhe, lhes”. Antes de escolher, identifique a regência do verbo.'],
    [/conotativ|denotativ/,
      '<b>Conotação em 60s:</b> linguagem denotativa usa sentido literal; conotativa usa sentido figurado, expressivo ou simbólico. Teste rápido: se a frase não puder ser entendida literalmente sem perder o efeito, provavelmente há conotação.'],
    [/extradiç|extradicao/,
      '<b>Extradição em 60s:</b> primeiro identifique nacionalidade, natureza do crime e limites constitucionais. Em questões jurídicas antigas, diferencie o gabarito histórico da regra vigente hoje.'],
    [/tráfico|trafico|hediond|inafianç|inafianc/,
      '<b>Crimes e Constituição em 60s:</b> não misture os atributos “inafiançável”, “imprescritível” e “insuscetível de graça ou anistia”. A Constituição usa combinações diferentes conforme o delito. Leia cada palavra do item.'],
    [/autarquia/,
      '<b>Autarquia em 60s:</b> é pessoa jurídica de direito público criada por lei para desempenhar atividade típica do Estado, com patrimônio e administração próprios. Ela integra a Administração Indireta, não a Direta.'],
    [/poder de polícia|poder de policia/,
      '<b>Poder de polícia em 60s:</b> é a atividade administrativa que limita ou condiciona direitos e atividades privadas em benefício do interesse público. Não confunda polícia administrativa com polícia judiciária.'],
    [/motivo|objeto|ato administrativo/,
      '<b>Ato administrativo em 60s:</b> motivo é o pressuposto de fato e de direito que leva à prática do ato; objeto é o efeito jurídico imediato que o ato produz. Pergunte “por quê?” para motivo e “o quê o ato faz?” para objeto.']
  ];
  for(const [re,lesson] of lessons) if(re.test(text)) return lesson;
  const generic={
    'Língua Portuguesa':'<b>Português em 60s:</b> antes de olhar as alternativas, identifique exatamente o fenômeno cobrado no trecho. Depois confronte uma alternativa por vez com a regra e com o contexto.',
    'Direito Constitucional':'<b>Constitucional em 60s:</b> separe regra, exceção e palavra absoluta. Muitas alternativas erradas trocam “pode” por “deve”, ampliam uma garantia ou retiram uma condição constitucional.',
    'Direito Administrativo':'<b>Administrativo em 60s:</b> identifique primeiro o instituto cobrado e depois seus elementos, atributos e limites. Alternativas costumam misturar conceitos próximos.',
    'Direito Penal e Processual Penal':'<b>Penal/Processual em 60s:</b> identifique o tipo penal ou instituto, seus elementos e a consequência jurídica. Cuidado com detalhes de dolo, consumação, competência e procedimento.',
    'Direitos Humanos':'<b>Direitos Humanos em 60s:</b> diferencie princípios, tratados, garantias e mecanismos de proteção. Leia com atenção expressões universais ou restritivas.',
    'Administração':'<b>Administração em 60s:</b> transforme o conceito em um fluxo simples: entrada → processo → resultado → controle. Depois compare cada afirmativa com esse modelo.',
    'Administração Geral':'<b>Administração Geral em 60s:</b> identifique primeiro o processo ou conceito cobrado e organize mentalmente suas etapas. Muitas alternativas erram ao trocar a função de uma etapa pela de outra.',
    'Noções de Administração':'<b>Noções de Administração em 60s:</b> identifique primeiro o processo ou conceito cobrado e organize mentalmente suas etapas. Muitas alternativas erram ao trocar a função de uma etapa pela de outra.',
  };
  return generic[q?.subject]||'<b>Estratégia de 60s:</b> descubra o conceito central, elimine afirmações claramente incompatíveis e só então compare as alternativas. Se ainda estiver em dúvida, use “Eliminar 1” e faça uma questão parecida.';
}

export function findSimilar(q,all){
  const base=new Set(words(q?.statement));
  let best=null,bestScore=-1;
  for(const other of all||[]){
    if(!other||other.id===q?.id||other.displayMode==='source-pdf') continue;
    const ow=words(other.statement), common=ow.filter(w=>base.has(w)).length;
    let score=common*3;
    if(other.subject===q.subject) score+=8;
    if(other.topic===q.topic) score+=5;
    if(score>bestScore){best=other;bestScore=score}
  }
  return best;
}
