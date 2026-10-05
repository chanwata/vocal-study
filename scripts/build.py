import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
DRAFT = (ROOT / 'docs/02-editorial-draft.md').read_text()
SPOTIFY = json.loads((ROOT / 'src/spotify.json').read_text())

def field(block, name):
    match = re.search(r'^\*\*' + re.escape(name) + r'：\*\*\s*(.+)$', block, re.M)
    return match.group(1).strip() if match else ''

def section(start, end):
    return DRAFT.split(start, 1)[1].split(end, 1)[0]

def strip_refs(value):
    return re.sub(r'\[S\d+\]', '', value).strip()

rows = re.findall(r'^\| (rec-\d{3}) \| (\d{2}) ([ABC]) \| (.*?) — (.*?) \| (.*?) \| (.*?) \|$', DRAFT, re.M)
assert len(rows) == 42
recordings = []
for rid, num, tier, artist, title, version, prompt in rows:
    recordings.append(dict(id=rid, lessonId='lesson-' + num, tier=tier, artist=artist, title=title,
        version=version, prompt=prompt, spotifyId=SPOTIFY[rid],
        searchUrl='https://open.spotify.com/search/' + __import__('urllib.parse', fromlist=['quote']).quote(artist + ' ' + title)))

lessons = []
for match in re.finditer(r'^### Lesson (\d{2})｜([^\n]+)\n(.*?)(?=^### Lesson \d{2}｜|^## 5\.)', DRAFT, re.M | re.S):
    num, title, body = match.groups()
    lecture = body.split('**導入本文：**', 1)[1].split('**到達点：**', 1)[0].strip().split('\n\n')
    lessons.append(dict(id='lesson-' + num, number=int(num), title=title, lead=field(body, 'リード'),
        lecture=[strip_refs(x) for x in lecture], goal=field(body, '到達点'), question=field(body, '問い'),
        exercise=field(body, '任意の実験'), silent=field(body, '声を出さない課題'), answer=field(body, '回答例'),
        recordingIds=[r['id'] for r in recordings if r['lessonId'] == 'lesson-' + num]))
assert len(lessons) == 14 and all(len(x['recordingIds']) == 3 for x in lessons)

details = {}
for match in re.finditer(r'^### (rec-\d{3})｜[^\n]+\n(.*?)(?=^### rec-\d{3}｜|^## 6\.)', DRAFT, re.M | re.S):
    rid, body = match.groups()
    listens = re.findall(r'^\d\. (.+)$', body.split('**三つの聴き方：**', 1)[1].split('**短い実験：**', 1)[0], re.M)
    assert len(listens) == 3, rid
    details[rid] = dict(thesis=field(body, '一文'), background=strip_refs(field(body, '背景')),
        analysis=strip_refs(field(body, '聴く前の地図')), listens=listens,
        exercise=field(body, '短い実験'), silent=field(body, '声を出さない場合'),
        pitfall=field(body, '雑に覚えない'), question=field(body, 'メモの問い'))
for r in recordings:
    if r['id'] in details:
        r.update(details[r['id']])
    else:
        lesson = next(l for l in lessons if l['id'] == r['lessonId'])
        r.update(thesis=r['prompt'], background='', analysis='',
            listens=[f'冒頭から最初の一区切りを聴き、{lesson["question"]}',
                     r['prompt'], '伴奏と一緒に聴き直し、最初の印象がどう変わるかをメモする。'],
            exercise=lesson['exercise'], silent=lesson['silent'], pitfall='聞こえた表現から、歌手の意図や身体の使い方を断定しない。',
            question=lesson['question'])

artist_bios = {
    'Sam Cooke': 'Soul Stirrersでの活動を経て、ポップの分野で知られるようになった歌手・ソングライター。1957年の「You Send Me」は、その転機をたどる入口になる。',
    'Aretha Franklin': 'ソウルを代表する歌手。1987年、女性として初めてRock & Roll Hall of Fame入り。ここでは「Respect」の主声と応答する声を聴く。',
    'Billie Holiday': 'ジャズ歌唱の歴史に大きな足跡を残した歌手。人生の出来事だけで歌を説明せず、言葉と伴奏の拍との関係を追う。'
}
artists = [dict(name=name, bio=artist_bios.get(name, ''), recordingIds=[r['id'] for r in recordings if r['artist'] == name])
           for name in dict.fromkeys(r['artist'] for r in recordings)]

comparisons = []
comparison_block = section('## 7. 聴き比べページの6組', '## 8.')
for line in comparison_block.splitlines():
    if not line.startswith('|') or 'rec-' not in line: continue
    cells = [v.strip() for v in line.strip('|').split('|')]
    comparisons.append(dict(title=cells[0], recordingIds=re.findall(r'rec-\d{3}', cells[1]), question=cells[2]))
assert len(comparisons) == 6

labs = []
for match in re.finditer(r'^### (0[1-8])｜([^\n]+)\n(.*?)(?=^### 0[1-8]｜|^## 9\.)', DRAFT, re.M | re.S):
    num, title, body = match.groups()
    labs.append(dict(id='lab-' + num, title=title, paragraphs=[p.strip() for p in body.strip().split('\n\n')]))
assert len(labs) == 8

glossary = []
for line in section('## 9. 基礎と用語 — 掲載初稿', '## 10.').splitlines():
    if not line.startswith('|') or line.startswith('|---') or line.startswith('| 用語'): continue
    name, meaning = [v.strip() for v in line.strip('|').split('|', 1)]
    glossary.append(dict(term=name, meaning=meaning))

course = dict(id='vocal-listening-lab', version=1, title='VOCAL LISTENING LAB',
    lessons=lessons, recordings=recordings, artists=artists, comparisons=comparisons, labs=labs,
    glossary=glossary, playlist=None, verifiedDetailedCount=len(details))
(ROOT / 'src/course.json').write_text(json.dumps(course, ensure_ascii=False, indent=2) + '\n')

template = (ROOT / 'src/template.html').read_text()
payload = json.dumps(course, ensure_ascii=False).replace('<', '\\u003c').replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
page = template.replace('/* COURSE */', 'const COURSE = ' + payload + ';')
page = page.replace('/* STYLE */', (ROOT / 'src/style.css').read_text())
page = page.replace('/* APP */', (ROOT / 'src/app.js').read_text())
assert all(x not in page for x in ['/* COURSE */', '/* STYLE */', '/* APP */'])
(ROOT / 'dist').mkdir(exist_ok=True)
(ROOT / 'dist/index.html').write_text(page)
print(f'Built {len(lessons)} lessons, {len(recordings)} recordings, {len([r for r in recordings if r["spotifyId"]])} Spotify tracks; {len(page.encode()):,} bytes')
