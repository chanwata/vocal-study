const STORAGE_KEY='vocal-listening-lab-v1';
const LESSONS=new Map(COURSE.lessons.map(x=>[x.id,x]));
const RECORDINGS=new Map(COURSE.recordings.map(x=>[x.id,x]));
const ARTISTS=new Map(COURSE.artists.map(x=>[x.name,x]));
const $=(q,root=document)=>root.querySelector(q);
const $$=(q,root=document)=>[...root.querySelectorAll(q)];
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const smallMd=value=>esc(value).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
const blank=()=>({lessonCompleted:{},recordingObserved:{},notes:{},lastLessonId:'lesson-01',learningMode:'listen',updatedAtByField:{}});
let state=blank(),brokenRaw=null,storageError=false;
let activeHash='';

function validState(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('保存データの形式が不正です');
  const clean=blank();
  for(const [key,allowed] of [['lessonCompleted',LESSONS],['recordingObserved',RECORDINGS]]){
    const data=raw[key]??{};
    if(!data||typeof data!=='object'||Array.isArray(data))throw Error(key+'が不正です');
    for(const [id,value] of Object.entries(data))if(allowed.has(id)){
      if(typeof value!=='boolean')throw Error(key+'の値が不正です');
      clean[key][id]=value;
    }
  }
  const notes=raw.notes??{};
  if(!notes||typeof notes!=='object'||Array.isArray(notes))throw Error('メモが不正です');
  for(const [key,value] of Object.entries(notes)){
    if(!/^(lesson:lesson-\d{2}|recording:rec-\d{3}|comparison:comparison-\d{2})$/.test(key))continue;
    const [kind,id]=key.split(':');
    if((kind==='lesson'&&!LESSONS.has(id))||(kind==='recording'&&!RECORDINGS.has(id))||(kind==='comparison'&&(!Number(id.slice(-2))||Number(id.slice(-2))>COURSE.comparisons.length)))continue;
    if(typeof value!=='string'||value.length>20000)throw Error('メモの値が不正です');
    clean.notes[key]=value;
  }
  if(LESSONS.has(raw.lastLessonId))clean.lastLessonId=raw.lastLessonId;
  if(['listen','sing'].includes(raw.learningMode))clean.learningMode=raw.learningMode;
  const stamps=raw.updatedAtByField??{};
  if(stamps&&typeof stamps==='object'&&!Array.isArray(stamps))for(const [key,value] of Object.entries(stamps)){
    if(key.length<=80&&typeof value==='string'&&value.length<=40)clean.updatedAtByField[key]=value;
  }
  return clean;
}
function fromStorage(){const raw=localStorage.getItem(STORAGE_KEY);return raw===null?blank():validState(JSON.parse(raw))}
try{state=fromStorage()}catch(error){try{brokenRaw=localStorage.getItem(STORAGE_KEY)}catch(_){}storageError=true}
function message(text){const box=$('#message');box.hidden=false;box.textContent=text}
function updateStatus(text){$('#save-indicator').textContent=text}
function save(kind,id,value){
  state[kind][id]=value;
  const stamp=new Date().toISOString();state.updatedAtByField[kind+'.'+id]=stamp;
  try{
    if(brokenRaw!==null)throw Error('保存済みデータが壊れています');
    const latest=fromStorage();
    latest[kind][id]=value;latest.updatedAtByField[kind+'.'+id]=stamp;
    if(kind==='lessonCompleted'||kind==='notes'&&id.startsWith('lesson:'))latest.lastLessonId=kind==='lessonCompleted'?id:id.slice(7);
    if(kind==='recordingObserved')latest.lastLessonId=RECORDINGS.get(id).lessonId;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(latest));state=latest;
    storageError=false;updateStatus('この端末に保存済み');
  }catch(error){storageError=true;updateStatus('保存に失敗');message('ブラウザに保存できません。入力はこの画面に残っています。「記録」からバックアップできます。')}
  updateProgress();
}
function saveMode(mode){
  state.learningMode=mode;
  try{const latest=fromStorage();latest.learningMode=mode;localStorage.setItem(STORAGE_KEY,JSON.stringify(latest));state=latest;updateStatus('この端末に保存済み')}catch(_){storageError=true;message('学習モードを保存できません。')}
  render();
}
function updateProgress(){const count=Object.values(state.lessonCompleted).filter(Boolean).length;$('#course-progress').value=count;$('#progress-text').textContent=count+' / '+COURSE.lessons.length;$$('.lesson-link').forEach(a=>{const done=$('.done',a);if(done)done.textContent=state.lessonCompleted[a.dataset.lesson]?'✓':''})}
function lessonHref(id){return '#'+id}
function trackHref(id){const track=RECORDINGS.get(id);return '#'+track.lessonId+'/recording/'+id}
function labelFor(r){return r.spotifyId?'Spotifyで曲を開く（版を確認）':'Spotifyで曲を検索'}
function download(filename,contents,type){const blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function exportJSON(){download('vocal-listening-lab-backup.json',JSON.stringify({format:'vocal-listening-lab',version:1,courseId:COURSE.id,exportedAt:new Date().toISOString(),state},null,2),'application/json;charset=utf-8');message('学習済み・曲の記録・メモをJSONで書き出しました。')}
function exportTXT(){const lines=['VOCAL LISTENING LAB — メモ',''];for(const l of COURSE.lessons)lines.push('Lesson '+l.number+'：'+l.title,state.notes['lesson:'+l.id]||'（メモなし）','');download('vocal-listening-lab-notes.txt',lines.join('\n'),'text/plain;charset=utf-8');message('読書用メモを書き出しました。復元にはJSONを使います。')}
async function importJSON(file){
  if(!file)return;
  try{
    if(file.size>2000000)throw Error('2MBを超えています');
    const payload=JSON.parse(await file.text());
    if(payload.format!=='vocal-listening-lab'||payload.version!==1||payload.courseId!==COURSE.id)throw Error('この教材の対応したJSONではありません');
    const candidate=validState(payload.state);
    const l=Object.values(candidate.lessonCompleted).filter(Boolean).length;
    const t=Object.values(candidate.recordingObserved).filter(Boolean).length;
    const n=Object.keys(candidate.notes).length;
    if(!window.confirm(`バックアップで現在の記録を置き換えますか？\n学習済み${l}回／曲の記録${t}件／メモ${n}件\n現在の記録を残す場合は先にバックアップしてください。`))return;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(candidate));state=candidate;brokenRaw=null;storageError=false;
    render();updateStatus('復元済み');message('バックアップから復元しました。');
  }catch(error){message('復元できませんでした：'+error.message+'。現在の記録は変更していません。')}
  finally{$('#import-file').value=''}
}

function nav(){
  const groups=[['耳の入口',0,3],['表現の動き',3,7],['歌と作品',7,11],['自分へ戻す',11,14]];
  $('#lesson-nav').innerHTML=groups.map(([name,start,end])=>`<div class="nav-label">${name}</div>${COURSE.lessons.slice(start,end).map(l=>`<a class="lesson-link" data-lesson="${l.id}" href="${lessonHref(l.id)}"><span class="number">${String(l.number).padStart(2,'0')}</span><span>${esc(l.title)}</span><span class="done">${state.lessonCompleted[l.id]?'✓':''}</span></a>`).join('')}`).join('');
  $('#other-nav').innerHTML='<div class="nav-label">EXPLORE</div>'+[['#recordings','全42曲の索引'],['#artists','歌手・グループ'],['#compare','テーマで聴き比べる'],['#voice-lab','声を試す'],['#sound-lab','録音の実験室'],['#foundations','基礎と用語'],['#sources','資料と録音版'],['#data','記録とバックアップ']].map(([href,title])=>`<a class="other-link" href="${href}">${title}</a>`).join('');
}
function homePage(){const done=Object.values(state.lessonCompleted).filter(Boolean).length;return `<article>
  <header class="hero"><span class="hero-mark">14 LESSONS · 42 RECORDINGS</span><h1>声を聴く。<br>違いをつかむ。<br>自分の歌に持ち帰る。</h1><p class="lead">好きな歌の、どこに心が動いたのだろう。声の色、言葉を置くタイミング、ふっと消える語尾、重なり合うコーラス。ひとつずつ耳を向けると、歌の魅力が少しずつ具体的になる。</p><p>ソウル、ジャズ、ファンク、ロック、R&B、日本語の歌を14のテーマで聴き比べます。1回15分から。聴くだけの日も、ちゃんと一歩です。</p><div class="actions"><a class="button" href="#${done?state.lastLessonId:'lesson-01'}">${done?'続きから学ぶ':'最初のレッスンへ'}</a><a class="button-secondary" href="#recordings">曲から選ぶ</a></div><p class="muted">楽譜も専用機材も不要。発声の課題は任意です。</p></header>
  <div class="section-title"><h2>一曲、三つの聴き方</h2></div><div class="feature-grid"><div class="feature"><span class="step">01</span><h3>全体を受け取る</h3><p>まずは好きに聴いて、印象を一つ残す。</p></div><div class="feature"><span class="step">02</span><h3>今日の一点を追う</h3><p>入り、母音、語尾など、一つだけに集中する。</p></div><div class="feature"><span class="step">03</span><h3>伴奏の中へ戻す</h3><p>見つけた表現が、曲の中で何をしているか。</p></div></div>
  <div class="section-title"><h2>14のレッスン</h2><small>好きな順番でもOK</small></div><div class="card">${COURSE.lessons.map(l=>`<a class="catalog-item" href="#${l.id}"><span class="track-index">${String(l.number).padStart(2,'0')}</span><span class="text"><b>${esc(l.title)}</b><small>${esc(l.lead)}</small></span><span>${state.lessonCompleted[l.id]?'✓':'→'}</span></a>`).join('')}</div>
  <div class="card"><h2>この端末に記録する</h2><p>進捗とメモはこの端末・このブラウザに保存します。別端末への自動同期はありません。<a href="#data">バックアップを保存</a>して移せます。</p></div></article>`}
function audioBox(r){const url=r.spotifyId?'https://open.spotify.com/track/'+r.spotifyId:r.searchUrl;return `<div class="audio-box"><span class="eyebrow">LISTEN HERE · この曲を聴く</span>${r.spotifyId?`<iframe title="Spotifyで${esc(r.artist)}「${esc(r.title)}」を再生" src="https://open.spotify.com/embed/track/${r.spotifyId}?utm_source=generator&amp;theme=0" width="100%" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`:''}<div class="actions"><a class="button-secondary" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${labelFor(r)} ↗</a></div><p>${r.spotifyId?'歌手・曲名に合うSpotifyの候補をこの場で再生できます。':'本人の対象曲を特定できていないため、Spotify検索へ移動します。'} 同名のライブ・再発・別ミックスがあり得るため、対象録音の版を確認して聴いてください。再生範囲は利用環境によります。</p></div>`}
function profileSections(a){return `<div class="profile-sections"><section><h4>人物と作品</h4><p>${esc(a.bio)}</p></section><section><h4>声質の聴きどころ</h4><p>${esc(a.voice)}</p></section><section><h4>歌い方・フレージング</h4><p>${esc(a.phrasing)}</p></section><section><h4>録音・ミックスの聴きどころ</h4><p>${esc(a.production)}</p></section></div><div class="profile-experiment"><h4>録音して比べるなら</h4><p>${esc(a.engineering)}</p><small>学習用の再現実験です。本人の実際の収録設定を示すものではありません。</small></div><div class="profile-focus"><b>この曲で聴く</b><p>${esc(a.listen)}</p></div>${a.sourceUrl?`<p class="profile-source"><a href="${esc(a.sourceUrl)}" target="_blank" rel="noopener noreferrer">人物の資料を見る ↗</a></p>`:''}`}
function recordingCard(r){const expanded=location.hash.endsWith('/'+r.id);return `<details class="track-card" id="${r.id}" ${expanded?'open':''}><summary><span class="track-index">${r.id.slice(-3)}</span><span class="track-title"><b>${esc(r.title)}</b><small>${esc(r.artist)} · ${r.tier==='C'?'発展':'基本'}</small></span><span class="chevron" aria-hidden="true">＋</span></summary><div class="track-body">
  <div class="edition"><strong>対象録音の候補</strong>${esc(r.version)}。配信版と録音内容は照合中です。</div>${audioBox(r)}
  <p class="track-thesis">${esc(r.thesis)}</p>${r.background?`<p>${esc(r.background)}</p>`:''}${r.analysis?`<p>${esc(r.analysis)}</p>`:''}
  <details class="artist-inline"><summary>${esc(r.artist)}の声・表現・録音を読む</summary><div class="profile-body">${profileSections(ARTISTS.get(r.artist))}</div></details>
  <h3>三回の聴き方</h3><ol>${r.listens.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
  <div class="exercise"><strong>短く試す（任意）</strong><p>${esc(r.exercise)}</p><strong>声を出さずに進めるなら</strong><p>${esc(r.silent)}</p></div>
  <p class="pitfall"><b>ここは雑に覚えない：</b> ${esc(r.pitfall)}</p>
  <label class="check-row"><input type="checkbox" data-observed="${r.id}" ${state.recordingObserved[r.id]?'checked':''}>この曲の違いを一つメモした</label>
  <label for="note-${r.id}"><b>この曲のメモ</b><span class="muted"> — ${esc(r.question)}</span></label><textarea class="note-field" id="note-${r.id}" data-note="recording:${r.id}" placeholder="どの場面で、何が、どう変わった？">${esc(state.notes['recording:'+r.id]||'')}</textarea></div></details>`}
function lessonPage(l){const list=l.recordingIds.map(id=>RECORDINGS.get(id));return `<article><header class="lesson-head"><p class="meta">LESSON ${String(l.number).padStart(2,'0')} / 14 · 基本2曲＋発展1曲</p><h1>${esc(l.title)}</h1><p class="lead">${esc(l.lead)}</p></header>
  <div class="focus"><strong>今日の問い</strong><p>${esc(l.question)}</p></div><section class="card quick"><h2>まず15分で聴くなら</h2><p>${esc(list[0].title)}と${esc(list[1].title)}の短い一区切りを、それぞれ三つの耳で聴く。${esc(list[2].title)}は時間がある日に。気づいた違いを一つメモしよう。</p></section>
  <section class="card"><span class="eyebrow">LECTURE</span><h2>耳に入れる前の地図</h2>${l.lecture.map(x=>`<p>${esc(x)}</p>`).join('')}<p><b>今日の到達点：</b>${esc(l.goal)}</p></section>
  <div class="section-title" id="recordings-in-lesson"><h2>今日の3曲</h2><small>曲を開いて聴く</small></div>${list.map(recordingCard).join('')}
  <section class="card"><span class="eyebrow">TRY IT / JUST LISTEN</span><h2>自分に戻してみる</h2><p><b>声を使うなら：</b>${esc(l.exercise)}</p><p><b>聴いて進めるなら：</b>${esc(l.silent)}</p><p class="muted">出しやすい高さと無理のない音量で。痛み、声がれ、出しづらさを感じたら歌うのをやめて、聴く課題に切り替えてください。</p></section>
  <section class="card"><span class="eyebrow">CHECK YOUR EAR</span><h2>聴いたあとに</h2><p>${esc(l.question)}</p><details><summary class="check-row">観察の例を見る ＋</summary><p>${esc(l.answer)}</p><p class="muted">唯一の正解ではありません。自分が聴いた場面を添えてみましょう。</p></details></section>
  <section class="card" id="lesson-note"><span class="eyebrow">LISTENING NOTE</span><h2>今日の言葉を残す</h2><label for="lesson-text">どの場面で、何が、どう変わって聞こえた？</label><textarea class="note-field" id="lesson-text" data-note="lesson:${l.id}" placeholder="例：最初は短い語尾が、最後だけ長く残った。伴奏も前へ出てきた。">${esc(state.notes['lesson:'+l.id]||'')}</textarea><p class="muted">このブラウザに自動保存。<a href="#data">別端末への移行はJSONバックアップから</a>。</p><label class="check-row"><input type="checkbox" data-completed="${l.id}" ${state.lessonCompleted[l.id]?'checked':''}>このレッスンを学習済みにする</label></section>
  <nav class="lesson-bottom" aria-label="前後のレッスン">${l.number>1?`<a href="#${COURSE.lessons[l.number-2].id}">← 前のレッスン</a>`:'<span></span>'}<a href="#compare">聴き比べへ</a>${l.number<COURSE.lessons.length?`<a href="#${COURSE.lessons[l.number].id}">次へ →</a>`:'<a href="#home">はじめに戻る →</a>'}</nav></article>`}
function catalogRows(items){return items.map(r=>`<a class="catalog-item" href="${trackHref(r.id)}"><span class="track-index">${r.id.slice(-3)}</span><span class="text"><b>${esc(r.title)}</b><small>${esc(r.artist)} · Lesson ${Number(r.lessonId.slice(-2))} · ${r.tier==='C'?'発展':'基本'}</small></span><span>→</span></a>`).join('')||'<p>見つかりませんでした。曲名の一部や別の表現でも探せます。</p>'}
function recordingsPage(){return `<article><span class="eyebrow">RECORDING LIBRARY</span><h1>全42曲の索引</h1><p class="lead">曲、歌手、聴くテーマから選べます。録音版を確かめる前のSpotifyリンクは候補として表示しています。</p><input class="search" id="recording-search" type="search" placeholder="曲名・歌手・テーマで検索" aria-label="曲を検索"><div class="card" id="recording-results">${catalogRows(COURSE.recordings)}</div></article>`}
function artistRows(items){return items.map(a=>`<details class="card artist-card"><summary>${esc(a.name)} <span class="muted">· ${a.recordingIds.length}曲</span></summary><div class="details-panel">${profileSections(a)}<h4>教材内の曲</h4>${a.recordingIds.map(id=>{const r=RECORDINGS.get(id);return `<p><a href="${trackHref(id)}">${esc(r.title)} →</a><br><small>${esc(r.prompt)}</small></p>`}).join('')}</div></details>`).join('')||'<p>該当する歌手が見つかりません。</p>'}
function artistsPage(){return `<article><span class="eyebrow">ARTISTS & VOICES</span><h1>歌手・グループから聴く</h1><p class="lead">42組それぞれの略歴、声質、言葉の置き方、録音で聴ける違いを、対象曲と一緒に紹介します。録音の記述は聴き方の提案です。具体的な機材や処理は、確認できた資料がない限り特定しません。</p><input class="search" id="artist-search" type="search" placeholder="歌手・グループを検索" aria-label="歌手を検索"><div id="artist-results">${artistRows(COURSE.artists)}</div></article>`}
function comparePage(){return `<article><span class="eyebrow">COMPARATIVE LISTENING</span><h1>テーマで聴き比べる</h1><p class="lead">同じ問いに、違う歌はどう答える？ 技量を順位づけず、自分の耳の分類を作るページです。</p>${COURSE.comparisons.map((c,i)=>`<section class="card"><span class="eyebrow">PAIR ${String(i+1).padStart(2,'0')}</span><h2>${esc(c.title)}</h2><p>${esc(c.question)}</p>${c.recordingIds.map(id=>{const r=RECORDINGS.get(id);return `<a class="catalog-item" href="${trackHref(id)}"><span class="text"><b>${esc(r.title)}</b><small>${esc(r.artist)}</small></span>→</a>`}).join('')}<label for="compare-${i}"><b>比較メモ</b></label><textarea class="note-field" id="compare-${i}" data-note="comparison:comparison-${String(i+1).padStart(2,'0')}" placeholder="共通する働きと、違うところを一つずつ。">${esc(state.notes['comparison:comparison-'+String(i+1).padStart(2,'0')]||'')}</textarea></section>`).join('')}</article>`}
function labPage(sound){const items=sound?COURSE.labs:COURSE.lessons.map(l=>({id:l.id,title:l.title,paragraphs:[l.exercise,'声を出さない課題：'+l.silent]}));return `<article><span class="eyebrow">${sound?'RECORDING LAB':'VOICE LAB'}</span><h1>${sound?'録音の実験室':'短く試す、声を聴く'}</h1><p class="lead">${sound?'マイク、コンプ、空間、重ね録り。条件を一つだけ変えて、聞こえ方を比べましょう。':'歌うことは任意。原曲のキーや声色を再現せず、短い自作の言葉で違いを確かめます。'}</p><div class="card"><h2>声を使わないモード</h2><p>各レッスンに聴いて進める課題があります。今日は声を出さずに進めるなら、<button type="button" class="button-secondary" data-mode="listen">聴くモードにする</button></p><p class="muted">痛みや声がれがあるときは歌わずに休み、症状が続く場合は耳鼻咽喉科へ相談してください。</p></div>${items.map((x,i)=>`<section class="card lab-card"><span class="eyebrow">${sound?'SOUND LAB':'LESSON'} ${String(i+1).padStart(2,'0')}</span><h2>${esc(x.title)}</h2>${x.paragraphs.map(p=>`<p>${smallMd(p)}</p>`).join('')}${!sound?`<a href="#${x.id}">レッスンへ →</a>`:''}</section>`).join('')}</article>`}
function foundationsPage(){return `<article><span class="eyebrow">FOUNDATIONS</span><h1>基礎と用語</h1><p class="lead">名前を覚える前に、聴く場所を一つ決める。分からない言葉だけ、その都度戻って読めます。</p><div class="feature-grid">${[['リズム','歌の入り、止まる位置、伴奏との関係。'],['言葉','子音、母音、意味のまとまり。'],['声と録音','声色、強弱、重なり、空間。']].map(([h,p])=>`<div class="feature"><h3>${h}</h3><p>${p}</p></div>`).join('')}</div><h2 style="margin-top:30px">用語索引</h2><dl class="glossary-list">${COURSE.glossary.map(g=>`<div><dt>${esc(g.term)}</dt><dd>${esc(g.meaning)}</dd></div>`).join('')}</dl></article>`}
function sourcesPage(){return `<article><span class="eyebrow">SOURCES & RECORDINGS</span><h1>資料と録音版</h1><p class="lead">歴史・人物・機材についての事実と、私たちが提案する聴き方は区別しています。</p><div class="card"><h2>録音版の扱い</h2><p>この教材の42曲は選曲案から作成しています。Spotifyで曲名とアーティストが一致する候補は個別リンクを設置しました。同名のライブ、リマスター、別ミックスがあるため、全曲の対象版を確認したとは表示しません。リンクのない曲は検索へ案内します。</p><p>Spotifyの再生範囲はアカウント・地域・ブラウザなどで変わります。埋め込みが再生できなくても本文とメモは使えます。</p></div><div class="card"><h2>資料</h2><ul class="source-list"><li><a href="https://www.nidcd.nih.gov/health/taking-care-your-voice" target="_blank" rel="noopener noreferrer">NIDCD — 声のケア</a></li><li><a href="https://www.shure.com/en-US/insights/how-to-record-and-mix-vocals" target="_blank" rel="noopener noreferrer">Shure — 声の録音とミックス</a></li><li><a href="https://billieholiday.com/bio/" target="_blank" rel="noopener noreferrer">Billie Holiday公式紹介</a></li><li><a href="https://rockhall.com/inductees/sam-cooke/" target="_blank" rel="noopener noreferrer">Sam Cooke — Rock Hall</a></li><li><a href="https://rockhall.com/inductees/aretha-franklin/" target="_blank" rel="noopener noreferrer">Aretha Franklin — Rock Hall</a></li></ul><p>曲ごとの詳細な根拠と未確定項目は<a href="https://github.com/chanwata/vocal-study/tree/main/docs" target="_blank" rel="noopener noreferrer">設計・編集資料</a>に記載しています。</p></div></article>`}
function dataPage(){const l=Object.values(state.lessonCompleted).filter(Boolean).length,r=Object.values(state.recordingObserved).filter(Boolean).length,n=Object.keys(state.notes).filter(k=>state.notes[k].trim()).length;return `<article><span class="eyebrow">YOUR NOTES</span><h1>記録とバックアップ</h1><p class="lead">進捗とメモは、この端末・このブラウザに保存します。別端末への自動同期はありません。</p><div class="data-grid"><div><b>${l}</b><small>学習済み回</small></div><div><b>${r}</b><small>曲の記録</small></div><div><b>${n}</b><small>メモ</small></div></div><div class="card"><h2>データを持ち出す</h2><p>JSONには学習済みとメモのすべてが入り、別のブラウザに復元できます。TXTはメモを読むためのファイルです。</p><div class="actions"><button class="button" type="button" data-action="export-json">JSONバックアップを保存</button><button class="button-secondary" type="button" data-action="export-txt">メモをTXTで保存</button></div></div><div class="card"><h2>別端末から復元</h2><p>JSONファイルを選び、内容の件数を確認してから現在の記録と置き換えます。</p><button class="button-secondary" type="button" data-action="import">JSONから復元</button></div>${brokenRaw!==null?`<div class="card"><h2>保存済みデータを読み込めません</h2><p>元データを保持しています。まず原文を退避してから、空の記録でやり直せます。</p><div class="actions"><button class="button-secondary" data-action="raw-backup">元データを書き出す</button><button class="button-secondary" data-action="reset">この端末の記録を初期化</button></div></div>`:''}<div class="recording-note">ブラウザのサイトデータを消すと記録も消えることがあります。時々JSONバックアップを保存してください。</div></article>`}
function render(){
  const hash=location.hash||'#home';activeHash=hash;
  const match=hash.match(/^#(lesson-\d{2})(?:\/recording\/(rec-\d{3}))?$/);
  let html;
  if(match&&LESSONS.has(match[1]))html=lessonPage(LESSONS.get(match[1]));
  else if(hash==='#home')html=homePage();else if(hash==='#recordings')html=recordingsPage();else if(hash==='#artists')html=artistsPage();
  else if(hash==='#compare')html=comparePage();else if(hash==='#voice-lab')html=labPage(false);else if(hash==='#sound-lab')html=labPage(true);
  else if(hash==='#foundations')html=foundationsPage();else if(hash==='#sources')html=sourcesPage();else if(hash==='#data')html=dataPage();
  else {location.hash='#home';return}
  $('#content').innerHTML=html;
  document.title=(match?LESSONS.get(match[1]).title:$('#content h1')?.textContent||'声を聴く')+' — VOCAL LISTENING LAB';
  const navHash=match?'#'+match[1]:hash;
  $$('.lesson-link,.other-link,.mobile-tabs a').forEach(a=>{const on=a.getAttribute('href')===navHash;a.classList.toggle('active',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  $('.sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-toggle').innerHTML='目次を開く <span aria-hidden="true">＋</span>';
  updateProgress();if(storageError)updateStatus('保存に失敗');
  if(match&&match[2]){const card=$('#'+match[2]);if(card){card.open=true;requestAnimationFrame(()=>card.scrollIntoView({block:'start'}))}}else window.scrollTo(0,0);
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action],[data-mode]');if(!button)return;
  const action=button.dataset.action;
  if(action==='export-json')exportJSON();else if(action==='export-txt')exportTXT();else if(action==='import')$('#import-file').click();
  else if(action==='raw-backup'&&brokenRaw!==null)download('vocal-listening-lab-unreadable-data.txt',brokenRaw,'text/plain;charset=utf-8');
  else if(action==='reset'&&window.confirm('この端末に保存されている破損データを初期化しますか？ 元データは先に書き出せます。')){try{localStorage.removeItem(STORAGE_KEY);brokenRaw=null;storageError=false;state=blank();render();message('この端末の記録を初期化しました。')}catch(_){message('初期化できませんでした。')}}
  if(button.dataset.mode)saveMode(button.dataset.mode);
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.matches('[data-note]'))save('notes',el.dataset.note,el.value.slice(0,20000));
  if(el.id==='recording-search'){const q=el.value.normalize('NFKC').toLowerCase().trim();$('#recording-results').innerHTML=catalogRows(COURSE.recordings.filter(r=>[r.title,r.artist,r.prompt,r.version].join(' ').normalize('NFKC').toLowerCase().includes(q)))}
  if(el.id==='artist-search'){const q=el.value.normalize('NFKC').toLowerCase().trim();$('#artist-results').innerHTML=artistRows(COURSE.artists.filter(a=>a.name.normalize('NFKC').toLowerCase().includes(q)))}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.completed)save('lessonCompleted',el.dataset.completed,el.checked);
  if(el.dataset.observed)save('recordingObserved',el.dataset.observed,el.checked);
  if(el.id==='import-file')importJSON(el.files[0]);
});
$('#menu-toggle').addEventListener('click',()=>{const open=$('.sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));$('#menu-toggle').innerHTML=open?'目次を閉じる <span aria-hidden="true">−</span>':'目次を開く <span aria-hidden="true">＋</span>'});
window.addEventListener('hashchange',render);
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY)return;try{const incoming=fromStorage();const note=document.activeElement?.dataset?.note;if(note&&incoming.notes[note]!==state.notes[note]){message('別タブで同じメモが変更されました。入力中の文章は保持しています。バックアップしてから確認してください。');return}state=incoming;render();message('別タブの変更を反映しました。')}catch(_){message('別タブのデータを読み込めません。現在の入力は保持しています。')}});
nav();render();if(brokenRaw!==null)message('保存済みデータを読み込めません。元データは保持しています。「記録」から書き出せます。');
