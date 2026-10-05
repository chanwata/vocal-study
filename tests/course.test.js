const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

test('build embeds the course and contains no unfilled placeholders', () => {
  assert.match(html, /const COURSE = /);
  assert.match(html, /VOCAL LISTENING LAB/);
  assert.ok(!html.includes('/* COURSE */'));
  assert.ok(!html.includes('/* STYLE */'));
  assert.ok(!html.includes('/* APP */'));
});
