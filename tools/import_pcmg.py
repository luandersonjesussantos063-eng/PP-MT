"""Import full PCMG Investigador Tipo 1 exams from matching official PDFs.
Usage: python tools/import_pcmg.py DIRECTORY (prova2021.pdf/gabarito2021.pdf etc).
Keeps original question crops and shared Portuguese texts, checks all answer cells.
"""
import hashlib,json,re,sys
from pathlib import Path
import fitz
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SRC=Path(sys.argv[1]); OUT=ROOT/'assets/questions'; OUT.mkdir(exist_ok=True)
CONFIG={2025:dict(total=70,date='2025-01-26',board='FGV',notice='04/2024',paper='https://conhecimento.fgv.br/sites/default/files/concursos/investigador-de-policia-icns401-tipo-1.pdf',key='https://conhecimento.fgv.br/sites/default/files/concursos/gabaritodefinitivo_pcgmpinvestigador.pdf',landing='https://conhecimento.fgv.br/concursos/pcmg24/04',nulls=[59]),2021:dict(total=60,date='2021-12-12',board='FUMARC',notice='05/2021',paper='https://arquivos.qconcursos.com/prova/arquivo_prova/89456/fumarc-2021-pc-mg-investigador-de-policia-i-prova.pdf',key='https://arquivos.qconcursos.com/prova/arquivo_gabarito/89456/fumarc-2021-pc-mg-investigador-de-policia-i-gabarito.pdf',landing='https://www.fumarc.com.br/concursos',nulls=[22,29,40,57])}
SUBJECTS25=[(10,'Português'),(16,'Raciocínio Lógico-Matemático'),(24,'Informática'),(30,'Lei Orgânica da PCMG'),(36,'Direito Administrativo'),(42,'Direito Constitucional'),(47,'Direito Penal'),(52,'Direito Processual Penal'),(56,'Legislação Extravagante'),(60,'Direitos Humanos'),(65,'Medicina Legal'),(70,'Criminologia')]
SUBJECTS21=[(10,'Português'),(20,'Lei Orgânica da PCMG'),(30,'Noções de Direito'),(40,'Direitos Humanos'),(50,'Informática'),(55,'Criminologia'),(60,'Medicina Legal')]
def image(doc,page,box,name):
 pix=doc[page].get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(box)); Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(OUT/name,'WEBP',quality=88)
 return '../assets/questions/'+name

def rows(doc,year):
 out=[]
 for pi,page in enumerate(doc):
  if pi==0 or year==2021 and (pi<2 or pi>34) or year==2025 and pi>14:continue
  line=[]
  for b in page.get_text('dict')['blocks']:
   for l in b.get('lines',[]):
    t=''.join(s['text'] for s in l['spans']).strip(); x,y,x1,y1=l['bbox']
    if not t or y< (48 if year==2025 else 70) or y1>(788 if year==2025 else page.rect.height-15):continue
    col=int(x>300) if year==2025 else 0
    line.append(dict(text=t,page=pi,col=col,box=(x,y,x1,y1)))
  out.extend(sorted(line,key=lambda r:(r['col'],round(r['box'][1],1),r['box'][0])))
 return out

def crops(doc,segment,year,name,start=None):
 result=[]
 for pi,col in dict.fromkeys((r['page'],r['col']) for r in segment):
  part=[r for r in segment if (r['page'],r['col'])==(pi,col)]
  top=min(r['box'][1] for r in part)-3; bottom=max(r['box'][3] for r in part)+4
  x0,x1=(40,291) if year==2025 and col==0 else (308,559) if year==2025 else (25,397)
  result.append(image(doc,pi,(x0,top,x1,bottom),f'{name}-p{pi+1}-{col}.webp'))
 return result
raw={'exams':{},'questions':[]};canonical=[]; exams=[]; manifest=[]
for year,c in CONFIG.items():
 doc=fitz.open(SRC/f'prova{year}.pdf'); kd=fitz.open(SRC/f'gabarito{year}.pdf')
 kt=kd[0].get_text().split('Prova Tipo 1',1)[1].split('Prova Tipo 2',1)[0]
 if year==2025:
  tokens=re.findall(r'(?m)^\s*([A-E]|\*)\s*$',kt); assert len(tokens)==70,len(tokens)
  answers={i+1:(None if k=='*' else k) for i,k in enumerate(tokens)}
 else:
  answers={int(n):None if k=='NULA' else k for n,k in re.findall(r'\b(\d+)\s+(NULA|[A-D])\b',kt)}
 assert len(answers)==c['total']; assert [n for n,k in sorted(answers.items()) if k is None]==c['nulls']
 rs=rows(doc,year); starts=[]; expected=1
 for i,r in enumerate(rs):
  t=r['text']; m=re.fullmatch(r'(\d+)' if year==2025 else r'QUESTÃO\s+(\d+)',t)
  left=(43 if r['col']==0 else 312) if year==2025 else r['box'][0]
  if m and int(m[1])==expected and (year==2021 or abs(r['box'][0]-left)<2):starts.append(i);expected+=1
 assert len(starts)==c['total'],(year,len(starts),expected)
 supports={}
 if year==2021:
  for first,last,label in [(1,5,'01'),(6,10,'02')]:
   end=starts[first-1]; begin=max(i for i,r in enumerate(rs[:end]) if 'Leia o Texto '+label in r['text'])
   imgs=crops(doc,rs[begin:end],year,f'pcmg-{year}-texto{label}')
   for n in range(first,last+1):supports[n]=imgs
 examid=f'pcmg{year}'; name=f'PCMG · Investigador · {year}'
 note=f"Prova completa de Investigador de Polícia I, aplicada em {c['date'].split('-')[2]}/{c['date'].split('-')[1]}/{year}. Edital {c['notice']}, Tipo 1. Gabarito oficial definitivo; questões anuladas não entram na nota. Questões históricas: confira a legislação e o próximo edital."
 raw['exams'][examid]=dict(name=name,short=f'PCMG {year} · Investigador',year=year,contest='PCMG',board=c['board'],type='Investigador · Tipo 1'+(' · Branca' if year==2025 else ''),date=c['date'],source=c['paper'],paperPdf=c['paper'],keySource=c['key'],note=note,answerStatus='definitivo',originalTotal=c['total'])
 for num,start in enumerate(starts,1):
  end=starts[num] if num<c['total'] else len(rs)
  seg=rs[start:end]
  # Shared passage for questions 6–10 is separate from the end of question 5.
  cut=next((i for i,r in enumerate(seg) if 'Leia o Texto 02' in r['text']),len(seg));seg=seg[:cut]
  # Remove the next subject heading; it is not part of the previous question.
  cut=next((i for i,r in enumerate(seg[1:],1) if r['text'].startswith(('PROVA DE ','MÓDULO ')) or year==2025 and r['text'] in ['Informática Básica','Raciocínio Lógico-Matemático','Noções de Direitos Humanos','Noções de Criminologia','Noções de Medicina Legal','Noções de Direito Penal','Noções de Direito Constitucional','Noções de Direito Administrativo','Noções de Direito Processual Penal','Noções de Legislação Penal e','Lei Orgânica da Polícia Civil do Estado de']),len(seg));seg=seg[:cut]
  original=crops(doc,seg,year,f'pcmg-{year}-q{num}')
  statement=[];opts={};active=None
  for r in seg[1:]:
   t=r['text'];m=re.match(r'^\(([A-E])\)\s*(.*)',t)
   if m and ord(m[1])-65==len(opts):active=m[1];opts[active]=m[2]
   elif active:opts[active]+=' '+t
   else:statement.append(t)
  assert list(opts)==list('ABCDE' if year==2025 else 'ABCD'),(year,num,opts)
  subject=next(s for end,s in (SUBJECTS25 if year==2025 else SUBJECTS21) if num<=end)
  explanation='Questão oficialmente anulada; não entra no aproveitamento.' if answers[num] is None else f"Gabarito oficial definitivo: alternativa {answers[num]}. Confira o enunciado original e revise o conteúdo; esta questão ainda não tem comentário individual de resolução."
  q=dict(id=f'{examid}-{num}',exam=examid,number=num,subject=subject,text='\n'.join(statement),options=opts,key=answers[num],annulled=answers[num] is None,originalImages=original,supportImages=supports.get(num,[]),needsVisual=True,explanation=explanation)
  assert len(q['text'])>12,(year,num,q['text']);raw['questions'].append(q)
  if q['annulled']:continue
  canonical.append(dict(id=q['id'],subject='Língua Portuguesa' if subject=='Português' else subject,topic=subject,statement=q['text'],options=list(opts.values()),answer='ABCDE'.index(q['key']),origin='prova',explanation=explanation,context='',contextImages=[p.replace('../','./') for p in q['supportImages']],facsimile=[p.replace('../','./') for p in original],showOriginal=True,conceptId=subject,source=dict(board=c['board'],exam=name,examId=examid,year=str(year),number=str(num),examUrl=c['paper'],answerUrl=c['key'],answerStatus='definitivo',reviewedAt='2026-11-15',version='Tipo 1',page=seg[0]['page']+1)))
 exams.append(dict(id=examid,state='MG',year=str(year),board=c['board'],exam=name,title=name,examUrl=c['paper'],answerUrl=c['key'],landingUrl=c['landing'],answerStatus='definitivo',annulled=c['nulls'],total=c['total'],importedQuestionCount=c['total']-len(c['nulls']),note=note,sections=[]))
 manifest.append(dict(id=examid,**c,answers=answers,paperSha256=hashlib.sha256((SRC/f'prova{year}.pdf').read_bytes()).hexdigest(),keySha256=hashlib.sha256((SRC/f'gabarito{year}.pdf').read_bytes()).hexdigest()))
(ROOT/'missao/pcmg-bank.js').write_text('window.PCMG_BANK='+json.dumps(raw,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'pcmg-bank.js').write_text('export const PCMG_EXAMS='+json.dumps(exams,ensure_ascii=False,separators=(',',':'))+';\nexport const PCMG_QUESTIONS='+json.dumps(canonical,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'docs/pcmg-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Imported',len(raw['questions']),'questions;',len(canonical),'gradable;',len(list(OUT.glob('pcmg-*'))),'original crops')
