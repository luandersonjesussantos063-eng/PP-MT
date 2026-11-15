"""Import selected 2015/2017 questions from the matching published PMMG PDFs.

Usage: python tools/import_pmmg_complementary.py SOURCE_DIRECTORY
Files: 2015-prova.pdf, 2015-key.pdf, 2017-prova.pdf, 2017-key.pdf.
Published answer cells are checked against their actual red fills, not guessed.
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
OUT = ROOT / 'assets/questions'
CONFIG = {
    2015: dict(numbers=list(range(1, 8)) + list(range(28, 41)),
        course=2016, date='2015-08-02', key_date='2015-08-02', notice='03/2015',
        variant='Prova B — Branca',
        paper='https://arquivos.qconcursos.com/prova/arquivo_prova/43595/pm-mg-2015-pm-mg-soldado-da-policia-militar-prova.pdf',
        key='https://arquivos.qconcursos.com/prova/arquivo_gabarito/43595/pm-mg-2015-pm-mg-soldado-da-policia-militar-gabarito.pdf',
        checked={1:'D',2:'D',3:'B',4:'A',5:'C',6:'A',7:'C',28:'B',29:'D',30:'D',31:'A',32:'C',33:'B',34:'C',35:'D',36:'A',37:'B',38:'B',39:'D',40:'C'}),
    2017: dict(numbers=list(range(1, 11)) + list(range(29, 33)),
        course=2017, date='2017-02-19', key_date='2017-02-20', notice='13/2016',
        variant='Tipo A',
        paper='https://arquivos.qconcursos.com/prova/arquivo_prova/53288/pm-mg-2017-pm-mg-soldado-da-policia-militar-prova.pdf',
        key='https://arquivos.qconcursos.com/prova/arquivo_gabarito/53288/pm-mg-2017-pm-mg-soldado-da-policia-militar-gabarito.pdf',
        checked={1:'D',2:'B',3:'A',4:'B',5:'C',6:'D',7:'A',8:'A',9:'B',10:'C',29:'D',30:'B',31:'D',32:'A'}),
}


def lines(document):
    result = []
    for page_index, page in enumerate(document):
        page_lines = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                text = ''.join(span['text'] for span in line['spans']).strip()
                if not text or line['bbox'][1] < 65 or line['bbox'][3] > page.rect.height - 35:
                    continue
                if 'CENTRO DE RECRUTAMENTO' in text or 'CONCURSO PARA ADMISSÃO' in text or 'CONCURSO PÚBLICO PARA ADMISSÃO' in text:
                    continue
                page_lines.append(dict(text=text, page=page_index, box=line['bbox']))
        result.extend(sorted(page_lines, key=lambda row: (round(row['box'][1], 1), row['box'][0])))
    return result


def image(document, page_index, box, filename):
    pix = document[page_index].get_pixmap(matrix=fitz.Matrix(1.8, 1.8), clip=fitz.Rect(box))
    Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(OUT / filename, 'WEBP', quality=90)
    return '../assets/questions/' + filename


def crop_segment(document, segment, name):
    paths = []
    first_page, last_page = min(row['page'] for row in segment), max(row['page'] for row in segment)
    for index in range(first_page, last_page+1):
        rows = [row for row in segment if row['page'] == index]
        top = max(65, min((row['box'][1] for row in rows), default=69) - 4)
        bottom = document[index].rect.height-45 if index < last_page else min(document[index].rect.height - 40, max(row['box'][3] for row in rows) + 5)
        paths.append(image(document, index, (65, top, 550, bottom), f'{name}-p{index+1}.webp'))
    return paths


def published_answers(document):
    page = document[0]
    red = [drawing['rect'] for drawing in page.get_drawings()
           if drawing.get('fill') and drawing['fill'][0] > .8 and drawing['fill'][1] < .2 and drawing['fill'][2] < .2]
    rows, letters = [], []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            text = ''.join(s['text'] for s in line['spans']).strip()
            match = re.fullmatch(r'(\d+)ª QUESTÃO', text)
            if match:
                rows.append((int(match[1]), fitz.Rect(line['bbox'])))
            if text in 'ABCD' and len(text) == 1:
                box = fitz.Rect(line['bbox'])
                center = fitz.Point((box.x0 + box.x1)/2, (box.y0 + box.y1)/2)
                if any(center in rectangle for rectangle in red):
                    letters.append((text, box))
    answers = {}
    for number, label in rows:
        found = [letter for letter, box in letters if abs((box.y0+box.y1-label.y0-label.y1)/2) < 8
                 and box.x0 > label.x1 and (label.x0 > 300 or box.x0 < 300)]
        assert len(found) == 1, (number, found)
        answers[number] = found[0]
    assert len(answers) == 40
    return answers


raw_path = ROOT / 'missao/banco-transcrito.js'
raw = json.loads(raw_path.read_text().split('=', 1)[1].strip().removesuffix(';'))
module = (ROOT / 'pmmg-bank.js').as_uri()
bank = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    f"import {{PMMG_EXAMS,PMMG_QUESTIONS,PMMG_SUBJECTS}} from {json.dumps(module)};console.log(JSON.stringify({{exams:PMMG_EXAMS,questions:PMMG_QUESTIONS,subjects:PMMG_SUBJECTS}}))"], text=True))
ids = {'pmmg2015', 'pmmg2017'}
raw['questions'] = [q for q in raw['questions'] if q['exam'] not in ids]
bank['questions'] = [q for q in bank['questions'] if q['source']['examId'] not in ids]
bank['exams'] = [e for e in bank['exams'] if e['id'] not in ids]
manifest = []
OUT.mkdir(exist_ok=True, parents=True)

for year, config in CONFIG.items():
    exam_id = f'pmmg{year}'
    paper_path, key_path = SOURCE / f'{year}-prova.pdf', SOURCE / f'{year}-key.pdf'
    paper, answer_doc = fitz.open(paper_path), fitz.open(key_path)
    assert f"{config['notice']}" in paper[0].get_text()
    assert config['notice'] in answer_doc[0].get_text() or year == 2015
    answers = published_answers(answer_doc)
    for number, letter in config['checked'].items():
        assert answers[number] == letter, (year, number, answers[number], letter)
    ls = lines(paper)
    starts = []
    for index, row in enumerate(ls):
        match = re.match(r'^(\d+)ª\s*QUESTÃO\s*[–-]\s*', row['text'])
        if match:
            starts.append((int(match[1]), index, match.end()))
    assert [x[0] for x in starts] == list(range(1, 41)), (year, starts)
    support = []
    if year == 2017:
        end_text = next(row['box'][3] for row in ls if row['page'] == 3 and row['text'].startswith('SABINO, Fernando.'))
        support = [image(paper, 2, (65, 65, 550, paper[2].rect.height-40), 'pmmg-2017-texto-1.webp'),
                   image(paper, 3, (65, 65, 550, end_text+6), 'pmmg-2017-texto-2.webp')]
    else:
        text_start = next(row for row in ls if row['page'] == 11 and row['text'] == 'LÍNGUA PORTUGUESA')
        context_end = next(row['box'][1] for row in ls if row['page'] == 12 and row['text'].startswith('LÍNGUA PORTUGUESA - INTERPRETAÇÃO'))
        support = [image(paper, 11, (65, text_start['box'][1]-3, 550, paper[11].rect.height-40), 'pmmg-2015-texto-1.webp'),
                   image(paper, 12, (65, 65, 550, context_end-5), 'pmmg-2015-texto-2.webp')]
    note = f"Treino complementar: {len(config['numbers'])} questões selecionadas de 40. Português e Raciocínio Lógico-Matemático compatíveis com os tópicos do Anexo B do Edital 10/2024. CFSd {config['course']}, {config['variant']}, aplicação {config['date'].split('-')[::-1][0]}/{config['date'][5:7]}/{year}. Correção pelo gabarito oficial publicado em {'/'.join(config['key_date'].split('-')[::-1])}; não foi localizada versão posterior aos recursos. Não corresponde à prova completa nem ao formato atual."
    exam = dict(name=f"PMMG · Soldado · CFSd {config['course']} · seleção complementar", short=f'PMMG {year} · complementar',
        year=year, board='CRS/PMMG', courseYear=config['course'], type=f"CFSd {config['course']} · {config['variant']} · treino complementar", date=config['date'],
        source=config['paper'], paperPdf=config['paper'], keySource=config['key'], note=note, complementary=True, originalTotal=40,
        includedCount=len(config['numbers']), includedNumbers=config['numbers'], answerStatus='publicado', answerPublishedAt=config['key_date'])
    raw['exams'][exam_id] = exam
    bank['exams'].append(dict(id=exam_id, state='MG', year=str(year), board='CRS/PMMG', exam=exam['name'], title=exam['name'],
        examUrl=config['paper'], answerUrl=config['key'], landingUrl='https://www.policiamilitar.mg.gov.br/site/crs',
        answerStatus='publicado', answerPublishedAt=config['key_date'], annulled=[], importedQuestionCount=len(config['numbers']), total=40,
        complementary=True, includedNumbers=config['numbers'], note=note, sections=[]))
    key_image = image(answer_doc, 0, answer_doc[0].rect, f'pmmg-{year}-gabarito-publicado.webp')
    for number in config['numbers']:
        _, start, end = starts[number-1]
        stop = starts[number][1] if number < 40 else len(ls)
        first = (ls[start]['page'], ls[start]['box'][1]-16)
        last = (ls[stop]['page'], ls[stop]['box'][1]-16) if number < 40 else (999, 0)
        segment = [dict(row) for row in ls if first <= (row['page'], row['box'][1]) < last]
        if number == 40:
            stop_at = next((i for i, row in enumerate(segment) if row['text'] == 'TEMA PARA REDAÇÃO'), len(segment))
            segment = segment[:stop_at]
        segment = [row for row in segment if not re.fullmatch(r'(?:LÍNGUA PORTUGUESA.*|GRAMÁTICA|INTERPRETAÇÃO DE TEXTO|NOÇÕES DE DIREITO PENAL|NOÇÕES DE ESTATÍSTICA|GEOGRAFIA|DIREITOS HUMANOS)', row['text'])]
        original = crop_segment(paper, segment, f'pmmg-{year}-q{number}')
        for row in segment:
            row['text'] = re.sub(r'^'+str(number)+r'ª\s*QUESTÃO\s*[–-]\s*', '', row['text'])
        options, statement, active = {}, [], None
        for row in segment:
            match = re.match(r'^([A-D])\.\s*\(\s*\)\s*', row['text'])
            if match and ord(match[1])-65 == len(options):
                active = match[1]
                options[active] = row['text'][match.end():]
            elif active is None:
                statement.append(row['text'])
            else:
                options[active] += '\n' + row['text']
        assert set(options) == set('ABCD') and all(value.strip() for value in options.values()), (year, number, options)
        is_portuguese = number >= 28 if year == 2015 else number <= 10
        needs_context = number <= 5 if year == 2017 else 28 <= number <= 33
        subject = 'Português' if is_portuguese else 'Raciocínio Lógico-Matemático'
        text = '\n'.join(statement).strip()
        if year == 2015 and number == 4:
            text = 'Na fabricação de certo produto o lucro, em reais, de uma microempresa é dado por L(x) = −3x²/4 + 90x − 1500, sendo x o número de peças vendidas no mês. Quantas peças devem ser vendidas no mês para a empresa não ter prejuízo?'
        if year == 2015 and number == 5:
            text = 'Na lei n(t) = 15000 · (3/2)^(t+k), sendo k uma constante real, está representada a população n(t) que um pequeno município terá daqui a t anos, contados a partir de hoje. Sabendo que a população atual do município é de 10.000 habitantes, podemos afirmar que k vale:'
        question = dict(id=f'{exam_id}-{number}', exam=exam_id, number=number, subject=subject, sourceSubject='Noções de Estatística' if year == 2017 and not is_portuguese else 'Língua Portuguesa' if is_portuguese else 'Matemática',
            key=answers[number], annulled=False, kind='inline', text=text, options={key:value.strip() for key,value in options.items()},
            page=segment[0]['page']+1, supportImages=support if needs_context else [], originalImages=original,
            needsVisual=not is_portuguese or 'sublinhad' in text.lower() or 'destaqu' in text.lower(), complementary=True)
        raw['questions'].append(question)
        bank['questions'].append(dict(id=question['id'], subject='Língua Portuguesa' if is_portuguese else subject,
            topic=subject, statement=text, options=list(question['options'].values()), answer=ord(answers[number])-65,
            origin='prova', complementary=True, explanation=f"Gabarito oficial publicado em {'/'.join(config['key_date'].split('-')[::-1])}: alternativa {answers[number]}. Recorte complementar; não há confirmação de versão posterior aos recursos nem comentário individual de resolução.",
            context='Texto de apoio da prova original.' if needs_context else '', contextImages=[path.replace('../','./',1) for path in question['supportImages']],
            facsimile=[path.replace('../','./',1) for path in original], showOriginal=question['needsVisual'], conceptId='Língua Portuguesa' if is_portuguese else subject,
            source=dict(board='CRS/PMMG', exam=exam['name'], examId=exam_id, year=str(year), number=str(number), examUrl=config['paper'], answerUrl=config['key'],
                reviewedAt='2026-11-15', answerStatus='publicado', version=config['variant'], page=question['page'], sourceSubject=question['sourceSubject'])))
    manifest.append(dict(id=exam_id, date=config['date'], courseYear=config['course'], notice=config['notice'], variant=config['variant'], selected=config['numbers'],
        originalQuestionCount=40, importedQuestionCount=len(config['numbers']), paperUrl=config['paper'], keyUrl=config['key'], answerStatus='publicado', answerPublishedAt=config['key_date'],
        paperSha256=hashlib.sha256(paper_path.read_bytes()).hexdigest(), keySha256=hashlib.sha256(key_path.read_bytes()).hexdigest(),
        publishedAnswers={str(n):answers[n] for n in config['numbers']}, keyImage=key_image.replace('../','./',1),
        compatibilityReference='Edital DRH/CRS 10/2024, Anexo B, Português e itens 5.1 a 5.7 de Raciocínio Lógico-Matemático',
        excludedSubjects='Direito, legislação, história, geografia e informática não integram estes recortes.'))
raw['version'] = 11
raw['updated'] = '2026-11-15'
raw_path.write_text('window.EXAM_BANK=' + json.dumps(raw, ensure_ascii=False, separators=(',', ':')) + ';\n')
(ROOT / 'pmmg-bank.js').write_text('\n'.join('export const '+name+'='+json.dumps(bank[key], ensure_ascii=False, separators=(',', ':'))+';' for name,key in [('PMMG_EXAMS','exams'),('PMMG_QUESTIONS','questions'),('PMMG_SUBJECTS','subjects')])+'\n')
(ROOT / 'docs/pmmg-complementary-sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
print('Imported', sum(len(c['numbers']) for c in CONFIG.values()), 'complementary questions; published answer cells checked.')
