"""Rebuild the October 2026 supplied corpus. Requires PyMuPDF and Pillow.
Usage: python tools/import_supplied_exams.py ../upload ../tmp/pdfs/ba-final.pdf
Source files are copied into assets/exams; answer keys are never inferred.
"""
import re,json,sys,hashlib,shutil,subprocess
from pathlib import Path
import fitz
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; UP=Path(sys.argv[1]); BA=Path(sys.argv[2])
OUT=ROOT/'assets/questions'; OUT.mkdir(parents=True,exist_ok=True)
BASE='https://luandersonjesussantos063-eng.github.io/PP-MT/'
configs={1:('es-2013-sejus','SEJUS/ES — Agente Penitenciário','VUNESP','2013',50,'gabaritos.pdf'),2:('ba-2024-seap','SEAP/BA — Agente Penitenciário — Tipo 1','FGV','2024',80,None),3:('rs-2022-susepe','SUSEPE/RS — Agente Penitenciário','FUNDATEC','2022',80,'gabaritos_definitivos.pdf'),4:('al-2021-seris','SERIS/AL — Agente Penitenciário','CEBRASPE','2021',120,'gabarito_definitivo (1).pdf')}
def flat(t):
 t=re.sub(r'(\w)[\-\u00ad]\s*\n\s*(\w)',r'\1\2',t)
 return re.sub(r'\s+',' ',t).strip().replace('\u00ad','')
def layout(path):return subprocess.check_output(['pdftotext','-layout',str(path),'-']).decode()
def lines(doc,k):
 result=[]
 for pi,p in enumerate(doc):
  if k in [1,2,3] and pi<(2 if k==1 else 1):continue
  if k==1 and pi>10 or k==2 and pi>16:continue
  low,high={1:(20,807),2:(57,789),3:(46.5,806),4:(48,812)}[k]
  for b in p.get_text('dict')['blocks']:
   for l in b.get('lines',[]):
    t=''.join(s['text'] for s in l['spans']).strip();x,y,x2,y2=l['bbox']
    if not t or y<low or y2>high or 'pciconcursos' in t:continue
    if k==4 and '-- CONHECIMENTOS' in t:continue
    result.append(dict(t=t,p=pi+1,box=[x,y,x2,y2],col=0 if k==3 or k==4 and pi==3 else int(x>298)))
 return result
# Contexts begin after the preceding item, never belong to its statement.
AL_CONTEXT={1:'No fim do século',11:'A segurança é direito',16:'À luz da Lei estadual',21:'Julgue os próximos itens, relativos ao Windows',24:'Julgue os próximos itens, relativos a programas',26:'Em uma feira de ciências',31:'Com base no que dispõe',33:'Determinado cidadão',37:'Com relação à prevenção',39:'À luz das disposições',43:'No que diz respeito',51:'Com base na Lei estadual n.º 5.247',55:'De acordo com o Decreto',58:'Com base na Lei estadual n.º 7.993',61:'Acerca dos poderes',65:'Acerca da organização',68:'Acerca das atribuições',72:'Acerca dos direitos',75:'Com relação ao direito penal',82:'Com relação ao processo penal',89:'Uma testemunha',92:'Em relação às alterações',96:'Acerca dos crimes de lavagem',99:'Com',101:'Considerando',107:'Entre 1776',111:'A respeito dos aspectos históricos',114:'No âmbito econômico',116:'Atualmente, muitas regiões',118:'Acerca da apropriação',120:'O território do estado'}
ES_CONTEXT={1:'Leia a tirinha para',3:'Leia o poema para',9:'Leia o texto para',11:'Leia o texto para',16:'Leia o texto para',35:'Lei n.º 7.210/84',45:'Lei Complementar Estadual',48:'Lei n.º 9.455/97'}
def crop(doc,k,name,ls):
 paths=[]
 for pg,col in dict.fromkeys((l['p'],l['col']) for l in ls):
  group=[l for l in ls if l['p']==pg and l['col']==col]
  if not group:continue
  p=doc[pg-1];x0=24 if k==4 else 30 if k==1 else 38
  x1=574 if k==4 else 568 if k==1 else 559
  if k!=3 and not (k==4 and pg==4):x0=x0 if col==0 else 299;x1=297 if col==0 else x1
  rect=fitz.Rect(x0,max(20,min(l['box'][1] for l in group)-3),x1,min(p.rect.height-30,max(l['box'][3] for l in group)+3))
  pix=p.get_pixmap(matrix=fitz.Matrix(2,2),clip=rect)
  file=OUT/f'{name}-{len(paths)+1}.webp';Image.frombytes('RGB',[pix.width,pix.height],pix.samples).save(file,'WEBP',quality=86)
  paths.append('./'+str(file.relative_to(ROOT)))
 return paths
manifest=[]; allsets={}
for k,(id,exam,board,year,total,keyname) in configs.items():
 path=UP/f'agente_penitenciario ({k}).pdf';keypath=BA if k==2 else UP/keyname
 doc=fitz.open(path);ls=lines(doc,k)
 pattern={1:r'^(\d{2})\.\s*',2:r'^(\d{1,2})$',3:r'^QUESTÃO (\d{2})\s*[–-]\s*',4:r'^(\d{1,3})(?:\s+|$)'}[k]
 starts=[];expect=1
 for i,l in enumerate(ls):
  m=re.match(pattern,l['t'])
  if m and int(m[1])==expect:
   starts.append((i,m.end()));expect+=1
 assert len(starts)==total,(k,len(starts),expect)
 sections={};key={}
 kt=layout(keypath)
 if k==1:
  part=kt.split('002. Agente Penitenciário')[1].split('Versão 2')[0]
  key={int(n):a for n,a in re.findall(r'(\d+)\s*[–-]\s*([A-E])',part)}
 elif k==2:
  part=kt.split('TIPO 1')[1].split('TIPO 2')[0];ans=re.findall(r'\b[A-E]\b',part);assert len(ans)==80;key=dict(enumerate(ans,1))
 elif k==3:
  part=kt.split('Cargo: 2 - Agente Penitenciário')[1].split('Cargo: 3')[0]
  for n,a,s in re.findall(r'^\s*(\d+)\s+([A-E*])\s+([^\n]+)',part,re.M):key[int(n)]=a;sections[int(n)]=s.strip()
 else:
  rows=kt.splitlines()
  for i,r in enumerate(rows):
   if re.match(r'\s*Item\s+\d',r):
    nums=list(map(int,re.findall(r'\d+',r)));ans=rows[i+1].split()[1:]
    for n,a in zip(nums,ans):
     if n:key[n]=a
 assert len(key)==total,(k,len(key))
 raw={};pre=ls[:starts[0][0]]
 for n,(si,end) in enumerate(starts,1):
  stop=starts[n][0] if n<total else len(ls)
  raw[n]=[dict(l) for l in ls[si:stop]];raw[n][0]['t']=raw[n][0]['t'][end:]
 contexts={}
 if k==4:
  for n,prefix in AL_CONTEXT.items():
   prev=pre if n==1 else raw[n-1]
   matches=[i for i,l in enumerate(prev) if l['t'].startswith(prefix)]
   assert matches,(k,n,prefix)
   cut=matches[-1] if n in [99,101] else matches[0]
   contexts[n]=prev[cut:];del prev[cut:]
  raw[120]=[l for l in raw[120] if l['t']!='Espaço livre']
  raw[30]=[l for l in raw[30] if l['t']!='Espaço livre'];raw[60]=[l for l in raw[60] if l['t']!='Espaço livre']
 elif k==1:
  for n,prefix in ES_CONTEXT.items():
   prev=pre if n==1 else raw[n-1];matches=[i for i,l in enumerate(prev) if l['t'].startswith(prefix)]
   if matches:contexts[n]=prev[matches[0]:];del prev[matches[0]:]
 elif k==3:
  contexts[1]=pre
 # Remove section headers after option E (layout positions retained for image).
 subjects1=[(15,'Língua Portuguesa'),(25,'Raciocínio Lógico e Matemática'),(30,'Atualidades'),(34,'Direitos Humanos'),(44,'Legislação Penal'),(47,'Legislação Estadual'),(50,'Legislação Penal')]
 subjects2=[(10,'Língua Portuguesa'),(15,'Raciocínio Lógico e Matemática'),(20,'Informática'),(30,'Legislação Estadual'),(40,'Direito Constitucional'),(48,'Direito Administrativo'),(54,'Direito Penal'),(62,'Direito Processual Penal'),(72,'Legislação Penal'),(80,'Direitos Humanos')]
 subjects4=[(10,'Língua Portuguesa'),(15,'Segurança Pública'),(20,'Ética no Serviço Público'),(25,'Informática'),(30,'Raciocínio Lógico e Matemática'),(42,'Legislação Penal'),(50,'Direitos Humanos'),(60,'Legislação Estadual'),(67,'Direito Administrativo'),(74,'Direito Constitucional'),(81,'Direito Penal'),(88,'Direito Processual Penal'),(106,'Legislação Penal'),(113,'História'),(120,'Geografia')]
 # Inspect actual printed headings, with a per-question source subject preserved.
 questions=[];ctximages={n:crop(doc,k,f'{id}-context-{n}',v) for n,v in contexts.items()}
 for n in range(1,total+1):
  if key[n] in ['X','*']:continue
  seg=[l for l in raw[n] if l['t'] not in ['Matemática','Atualidades','conhecimentos específicos','Direitos Humanos','Conhecimentos Gerais','Conhecimentos Específicos','Noções de Direito Constitucional','Noções de Direito Administrativo','Noções de Direito Penal','Noções de Direito Processual Penal','Legislação Estadual','Legislação Extravagante','INFORMÁTICA','LEGISLAÇÃO APLICADA/ DIREITO','CONHECIMENTOS GERAIS','RACIOCÍNIO LÓGICO','Raciocínio Lógico Matemático','Noções de Informática']]
  if k in [1,2,3]:
   pat=r'^\(?([A-E])\)\s*';opts=[];statement=[];current=None
   for l in seg:
    t=l['t'];m=re.match(pat,t)
    if m and ord(m[1])-65==len(opts):opts.append(t[m.end():]);current=len(opts)-1
    elif current is None:statement.append(t)
    else:opts[current]+='\n'+t
   assert len(opts)==5,(k,n,opts)
   # Headings are separate from the fifth option and never part of its text.
   opts[-1]=re.split(r'\n(?:conhecimentos|Direitos Humanos|Conhecimentos|Língua Portuguesa|Raciocínio Lógico|Noções de |Ética no Serviço|Direito |Legislação |INFORMÁTICA|LEGISLAÇÃO|CONHECIMENTOS|RACIOCÍNIO|ATUALIDADES)',opts[-1])[0]
   statement=flat('\n'.join(statement));opts=[flat(o) for o in opts]
  else:statement=flat('\n'.join(l['t'] for l in seg));opts=['Certo','Errado']
  # Manual transcription corrections checked against rendered original pages.
  if k==1:
   if n==14:statement='Leia a tirinha para responder à questão. As lacunas da tirinha devem ser preenchidas, correta e respectivamente, com:'
   if n==15:statement='Leia o texto (horóscopo) a seguir e assinale a alternativa que completa, correta e respectivamente, as lacunas.\n\nA mente precisa _____ nutrição, tal qual o corpo físico. A nutrição da mente se dá através de uma boa leitura, talvez um filme, ou por meio de conversas que sirvam _____ propósito _____ viajar para lugares desconhecidos.'
   if n==17:statement=statement.replace('5 2 estão','2/5 estão')
   if n==18:statement=statement.replace('3 1 estuda','1/3 estuda')
   if n==19:statement='Observe os gráficos e analise as afirmações I, II e III.\n\n'+statement[statement.index('I. Em 2010, o aumento'):]
   if n==23:statement=statement.removesuffix(' 6 x 7 5 12 5')
   if n==24:statement=statement.replace(' A D C B O terreno',' O terreno')
   if n==25:statement=statement.replace('4 3 de um litro','3/4 de um litro')
  if k==3:
   if n==75:statement=statement[:statement.index(': p q r')+1]+'\n\n'+statement[statement.index('Com base na lógica'):]
   if n==77:statement=statement.replace('𝑥2 = 4','𝑥² = 4')
  assert statement and all(opts),(k,n)
  ctxnum=max([c for c in contexts if c<=n],default=0)
  if k==1 and 14<=n<35:ctxnum=0
  if k==3 and n>20:ctxnum=0
  context=flat('\n'.join(l['t'] for l in contexts[ctxnum])) if ctxnum else ''
  subject=sections.get(n) if k==3 else next(s for last,s in {1:subjects1,2:subjects2,4:subjects4}[k] if n<=last)
  subject={'Legislação Aplicada/ Direito':'Legislação Penal','Raciocínio Lógico':'Raciocínio Lógico e Matemática'}.get(subject,subject)
  answer=(0 if key[n]=='C' else 1) if k==4 else ord(key[n])-65
  qid=f'{id}-{n:03}';fac=crop(doc,k,qid,seg)
  q=dict(id=qid,subject=subject,topic=f'{board} • {year} • questão {n}',statement=statement,options=opts,answer=answer,explanation=f"Gabarito {'definitivo' if k!=1 else 'publicado no documento fornecido'}: {key[n]}. Questão histórica; a correção segue a prova da época, sem revisão de vigência legislativa.",origin='prova',displayMode='inline',source=dict(board=board,exam=exam,year=year,number=str(n),examId=id,examUrl=BASE+f'assets/exams/{id}-prova.pdf',answerUrl=BASE+f'assets/exams/{id}-gabarito.pdf',reviewedAt='2026-10-07',page=seg[0]['p'],answerStatus='definitivo' if k!=1 else 'publicado',version='1' if k in [1,2] else 'Única'),facsimile=fac)
  if context:q.update(context=context,contextImages=ctximages[ctxnum])
  # Original formatting is essential for figures, mathematical notation, and typographic clues.
  q['showOriginal']=bool(k==1 and n in [14,15,17,18,19,21,23,24,25] or k==2 and (11<=n<=15 or any(x in statement.lower() for x in ['sublinh','destaca','figura','tabela'])) or k==3 and (n in [26,29] or n>=71))
  questions.append(q)
 for kind,p in [('prova',path),('gabarito',keypath)]:
  # Remove only the download tracking header (encoded IP/timestamp), keeping attribution.
  clean=fitz.open(p)
  for xref in range(1,clean.xref_length()):
   if clean.xref_is_stream(xref):
    stream=clean.xref_stream(xref)
    if b'pcimarkpci' in stream:
     replaced=re.sub(rb'\(pcimarkpci[^)]*\)',b'()',stream)
     if replaced!=stream:clean.update_stream(xref,replaced)
  clean.save(ROOT/f'assets/exams/{id}-{kind}.pdf',garbage=4,deflate=True)
  clean.close()
 export='OFFICIAL_QUESTIONS_AL_2021' if k==4 else 'OFFICIAL_QUESTIONS_'+id.upper().replace('-','_')
 (ROOT/f'official-{id}.js' if k!=4 else ROOT/'official-al-2021.js').write_text('export const '+export+' = '+json.dumps(questions,ensure_ascii=False,indent=2)+';\n')
 entry=dict(id=id,exam=exam,state=id[:2].upper(),year=int(year),board=board,questionCount=total,importedQuestionCount=len(questions),annulled=[n for n,a in key.items() if a in ['*','X']],answerStatus='definitivo' if k!=1 else 'publicado',examSha256=hashlib.sha256(path.read_bytes()).hexdigest(),answerSha256=hashlib.sha256(keypath.read_bytes()).hexdigest(),examUrl=BASE+f'assets/exams/{id}-prova.pdf',answerUrl=BASE+f'assets/exams/{id}-gabarito.pdf')
 manifest.append(entry);allsets[id]=questions;print(id,len(questions),'annulled',entry['annulled'])
(ROOT/'imported-exams.js').write_text('export const IMPORTED_EXAMS = '+json.dumps(manifest,ensure_ascii=False,indent=2)+';\n')
