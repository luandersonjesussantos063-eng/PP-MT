import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path

spec = importlib.util.spec_from_file_location('monitor', Path(__file__).parents[1] / 'tools/update_concurso.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

class MonitorTests(unittest.TestCase):
    def setUp(self):
        self.source = {'id':'test', 'name':'Diário Oficial', 'url':'https://iomat.mt.gov.br/legislacao/diario_oficial/2499/2026/10'}
        self.item = m.make_item('Novo concurso para Polícia Penal', 'Anúncio de concurso', 'https://www.sejus.mt.gov.br/w/concurso-penal', self.source)

    def test_relevance_ignores_other_careers_and_routine_news(self):
        self.assertFalse(m.relevant('Concurso da Polícia Militar de Mato Grosso'))
        self.assertFalse(m.relevant('Polícia Penal realiza operação no presídio'))
        self.assertTrue(m.relevant('Comissão de concurso para policial penal'))

    def test_old_calls_do_not_become_new_exam(self):
        self.assertEqual(m.kind('Convocação de aprovados no edital 001/2016 de agente penitenciário'),'convocacao')
        self.assertEqual(m.kind('Polícia Penal anuncia novo concurso e convoca aprovados de 2016'),'novo-concurso')
        self.assertEqual(m.kind('Edital de processo seletivo simplificado para vigilante prisional temporário'),'seletivo')

    def test_iomat_extracts_matched_block_and_publication_date(self):
        html = '<div class="resultados"><li class="item-li item-cor"><h4>D.O. nº 29331 de 6/10/2026 - Comissão do concurso Polícia Penal</h4><div class="content-result"><p>Comissão instituída para concurso da Polícia Penal.</p></div><a href="/legislacao/diario_oficial/detalhes/123">Visualizar</a></li></div>'
        items = m.parse_iomat(html,self.source)
        self.assertEqual(len(items),1);self.assertEqual(items[0]['publishedAt'],'2026-10-06')
        self.assertTrue(items[0]['url'].endswith('/123'))

    def test_navigation_cannot_pollute_an_unrelated_document(self):
        html='<div class="journal-content-article"><nav>Concurso Polícia Penal</nav><p><a href="/documents/d/test">Edital do concurso professor</a>Secretaria de Educação</p></div>'
        self.assertEqual(m.parse_liferay(html,self.source),[])

    def test_failure_retains_items_and_does_not_advance_success(self):
        old={'items':[self.item], 'lastSuccessAt':'2026-10-07T12:00:00Z','sources':[]}
        out=m.merge(old,[(self.source,[],'TimeoutError')],'2026-10-08T12:00:00Z')
        self.assertEqual(out['items'][0]['id'],self.item['id'])
        self.assertEqual(out['lastSuccessAt'],old['lastSuccessAt']);self.assertEqual(out['checkStatus'],'error')

    def test_partial_success_and_duplicates(self):
        old={'items':[], 'sources':[]}
        other={**self.source,'id':'other'}
        out=m.merge(old,[(self.source,[self.item,self.item],None),(other,[],'HTTPError')],'2026-10-08T12:00:00Z')
        self.assertEqual(len(out['items']),1);self.assertEqual(out['checkStatus'],'partial')
        self.assertIsNone(out.get('lastSuccessAt'));self.assertEqual(out['newCount'],1)

    def test_block_unofficial_sources_and_schema_changes(self):
        self.assertFalse(m.official_url('https://mt.gov.br.evil.test/w/news'))
        self.assertFalse(m.official_url('https://user@mt.gov.br/w/news'))
        self.assertFalse(m.official_url('http://www.mt.gov.br/w/news'))
        with self.assertRaises(ValueError):m.parse_iomat('<html>Captcha</html>',self.source)
        with self.assertRaises(ValueError):m.parse_liferay('<html>Sign in</html>',self.source)

    def test_dates_require_explicit_event_and_ignore_predictions(self):
        text='Início das inscrições: 01/11/2026. Fim das inscrições: 30/11/2026. Prova objetiva prevista para 20/12/2026.'
        dates=m.confirmed_events(text,self.source['url'])
        self.assertEqual([d['date'] for d in dates],['2026-11-01','2026-11-30'])
        self.assertEqual(m.confirmed_events('Publicado em 08/10/2026. Inscrições homologadas.',self.source['url']),[])

    def test_january_tracks_previous_year(self):
        sources=m.sources_for(datetime(2027,1,10,tzinfo=timezone.utc))
        self.assertTrue(any('/2026/12' in s['url'] for s in sources))

if __name__=='__main__':unittest.main()
