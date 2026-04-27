const test = require('node:test');
const assert = require('node:assert/strict');
const dmCore = require('../helpers/dmCore');

test('normalizePair returns deterministic ordering', () => {
  assert.deepEqual(dmCore.normalizePair('b', 'a'), ['a', 'b']);
  assert.deepEqual(dmCore.normalizePair('a', 'b'), ['a', 'b']);
});

test('parseAttachments accepts upload URLs only', () => {
  const parsed = dmCore.parseAttachments({
    attachments: JSON.stringify({ messageType: 'image', attachmentUrl: '/uploads/x.png' })
  });
  assert.equal(parsed.messageType, 'image');
  assert.equal(parsed.attachmentUrl, '/uploads/x.png');
});

test('parseAttachments strips unsafe external URLs', () => {
  const parsed = dmCore.parseAttachments({
    attachments: JSON.stringify({ messageType: 'file', attachmentUrl: 'https://example.com/file.pdf' })
  });
  assert.equal(parsed.messageType, 'file');
  assert.equal(parsed.attachmentUrl, '');
});
