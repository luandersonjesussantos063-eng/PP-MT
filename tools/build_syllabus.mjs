import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync('content/edital-mt-topics.json','utf8'));
const authorialFiles=['authorial-mt-100.json',...fs.readdirSync('content').filter(p=>/^authorial-mt-.*-lote.*\.json$/.test(p)).sort()];
const groups=authorialFiles.flatMap(p=>JSON.parse(fs.readFileSync('content/'+p,'utf8')).groups);
const rename={'juizos-fato-valor':'fato-valor','funcoes-administrativas':'funcoes-admin','eficiencia-eficacia':'desempenho','remedios-constitucionais':'remedios','administracao-direta-indireta':'direta-indireta'};
for(const [old,next] of Object.entries(rename)){if(old in data.authorialSlugTopics){data.authorialSlugTopics[next]=data.authorialSlugTopics[old];delete data.authorialSlugTopics[old]}}
for(const g of groups){const ids=data.authorialSlugTopics[g.slug];if(!ids)throw Error(`Unmapped ${g.slug}`);data.conceptTopics[`mt-autoral-202610-${g.slug}-01`]=ids}
fs.writeFileSync('content/edital-mt-topics.json',JSON.stringify(data,null,2)+'\n');
fs.writeFileSync('syllabus-data.js',`// Built from content/edital-mt-topics.json; grouped historical syllabus.\nexport const SYLLABUS=${JSON.stringify(data)};\n`);
