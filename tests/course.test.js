const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const course = JSON.parse(fs.readFileSync(path.join(root, 'src/course.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');

test('14 lessons each contain three unique recordings', () => {
  assert.equal(course.lessons.length, 14);
  assert.equal(course.recordings.length, 42);
  const ids = course.recordings.map(r => r.id);
  assert.equal(new Set(ids).size, 42);
  for (const lesson of course.lessons) {
    assert.equal(lesson.recordingIds.length, 3);
    assert.ok(lesson.lead && lesson.goal && lesson.question && lesson.silent);
    for (const id of lesson.recordingIds) assert.equal(course.recordings.find(r => r.id === id).lessonId, lesson.id);
  }
});

test('Spotify candidates and search fallbacks have valid destinations', () => {
  for (const recording of course.recordings) {
    assert.match(recording.searchUrl, /^https:\/\/open\.spotify\.com\/search\//);
    if (recording.spotifyId) assert.match(recording.spotifyId, /^[A-Za-z0-9]{22}$/);
    assert.equal(recording.listens.length, 3);
  }
  assert.equal(course.recordings.filter(r => r.spotifyId).length, 41);
  assert.equal(course.recordings.find(r => r.id === 'rec-040').spotifyId, null);
});

test('every recording has a distinct YouTube thumbnail and video source', () => {
  const videos = JSON.parse(fs.readFileSync(path.join(root, 'src/youtube.json'), 'utf8'));
  assert.equal(Object.keys(videos).length, 42);
  assert.equal(new Set(Object.values(videos).map(v => v.id)).size, 42);
  for (const r of course.recordings) {
    assert.match(r.youtube.id, /^[A-Za-z0-9_-]{11}$/);
    assert.deepEqual(r.youtube, videos[r.id]);
  }
  assert.match(course.recordings.find(r => r.id === 'rec-040').youtube.type, /未確認/);
});

test('every featured artist has substantial voice and production notes', () => {
  assert.equal(course.artists.length, 42);
  assert.deepEqual(new Set(course.artists.map(a => a.name)), new Set(course.recordings.map(r => r.artist)));
  for (const artist of course.artists) {
    for (const key of ['bio', 'voice', 'phrasing', 'production', 'engineering', 'listen']) {
      assert.ok(artist[key].length >= 20, `${artist.name}: ${key}`);
    }
    if (artist.sourceUrl) assert.match(artist.sourceUrl, /^https:\/\//);
    assert.ok(artist.recordingIds.length > 0);
  }
  assert.ok(course.artists.every(a => ['bio', 'voice', 'phrasing', 'production', 'engineering'].reduce((n, key) => n + a[key].length, 0) > 260));
});

test('all 42 recordings have their own scene and three listening cues', () => {
  const guides = fs.readFileSync(path.join(root, 'src/recording_guides.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(guides.length, 42);
  assert.equal(new Set(guides.map(g => g.id)).size, 42);
  for (const recording of course.recordings) {
    assert.ok(recording.scene.length >= 30, recording.id);
    assert.equal(recording.points.length, 3, recording.id);
    assert.ok(recording.points.every(p => p.length >= 16), recording.id);
    assert.deepEqual(recording.points, guides.find(g => g.id === recording.id).points);
  }
});

test('lesson recordings render on the page without nested disclosures', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  assert.match(app, /<section class="track-card"/);
  assert.match(app, /r\.points\.map/);
  assert.ok(!app.includes('<details class="track-card"'));
  assert.ok(!app.includes('<details class="artist-inline"'));
});

test('build embeds the course and contains no unfilled placeholders', () => {
  assert.match(html, /const COURSE = /);
  assert.match(html, /VOCAL LISTENING LAB/);
  assert.ok(!html.includes('/* COURSE */'));
  assert.ok(!html.includes('/* STYLE */'));
  assert.ok(!html.includes('/* APP */'));
});

test('lesson cards show matching YouTube thumbnails and retain Spotify links', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  const fn = app.match(/^function audioBox\(r\).*$/m)?.[0];
  assert.ok(fn);
  const ctx = { esc: value => String(value), labelFor: r => r.spotifyId ? 'Spotifyで曲を開く' : 'Spotifyで曲を検索' };
  vm.runInNewContext(fn, ctx);
  const direct = ctx.audioBox(course.recordings.find(r => r.id === 'rec-020'));
  assert.match(direct, /data-youtube="A3adFWKE9JE"/);
  assert.match(direct, /img\.youtube\.com\/vi\/A3adFWKE9JE\/hqdefault\.jpg/);
  assert.match(direct, /youtube\.com\/watch\?v=A3adFWKE9JE/);
  assert.match(direct, /open\.spotify\.com\/track\/64SIlhd3BaHCCMSfajXG7l/);
  const fallback = ctx.audioBox(course.recordings.find(r => r.id === 'rec-040'));
  assert.match(fallback, /data-youtube="XE45nsroFTE"/);
  assert.match(fallback, /Spotifyで曲を検索/);
});

test('all artists have career, signature, explicit musician relationships and sources', () => {
  for (const artist of course.artists) {
    assert.ok(artist.bio.length >= 150, artist.name);
    assert.ok(artist.signature.length >= 50, artist.name);
    assert.ok(artist.related.length >= 2, artist.name);
    for (const person of artist.related) {
      assert.ok(person.name && person.relation.length >= 20, artist.name);
    }
    assert.ok(artist.sources.length > 0, artist.name);
    for (const source of artist.sources) {
      assert.ok(source.label, artist.name);
      assert.equal(new URL(source.url).protocol, 'https:');
    }
  }
});

test('every lesson renders its own three complete artist profiles without disclosures', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  const functions = app.slice(app.indexOf('function audioBox'), app.indexOf('function catalogRows'));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ctx = { COURSE: course, RECORDINGS: new Map(course.recordings.map(r => [r.id, r])),
    ARTISTS: new Map(course.artists.map(a => [a.name, a])), esc, labelFor: () => 'Spotify',
    state: { recordingObserved: {}, lessonCompleted: {}, notes: {} } };
  vm.runInNewContext(functions, ctx);
  for (const lesson of course.lessons) {
    const rendered = ctx.lessonPage(lesson);
    assert.equal((rendered.match(/class="artist-context"/g) || []).length, 3, lesson.id);
    assert.ok(!rendered.includes('<details'), lesson.id);
    for (const id of lesson.recordingIds) {
      const recording = ctx.RECORDINGS.get(id), artist = ctx.ARTISTS.get(recording.artist);
      assert.ok(rendered.includes(esc(artist.bio)), artist.name);
      assert.ok(rendered.includes(esc(artist.signature)), artist.name);
      for (const person of artist.related) assert.ok(rendered.includes(esc(person.relation)), artist.name);
      for (const point of recording.points) assert.ok(rendered.includes(esc(point)), recording.id);
    }
  }
});
