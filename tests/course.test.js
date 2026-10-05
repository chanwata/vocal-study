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

test('lesson cards show an inline player or a search fallback', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  const fn = app.match(/^function audioBox\(r\).*$/m)?.[0];
  assert.ok(fn);
  const ctx = { esc: value => String(value), labelFor: r => r.spotifyId ? 'Spotifyで曲を開く' : 'Spotifyで曲を検索' };
  vm.runInNewContext(fn, ctx);
  const direct = ctx.audioBox(course.recordings.find(r => r.id === 'rec-020'));
  assert.match(direct, /<iframe[^>]+src="https:\/\/open\.spotify\.com\/embed\/track\/64SIlhd3BaHCCMSfajXG7l/);
  assert.ok(!direct.includes('ここでプレーヤーを表示'));
  const fallback = ctx.audioBox(course.recordings.find(r => r.id === 'rec-040'));
  assert.ok(!fallback.includes('<iframe'));
  assert.match(fallback, /Spotifyで曲を検索/);
});
