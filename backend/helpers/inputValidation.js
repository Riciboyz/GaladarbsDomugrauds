const INPUT_LIMITS = Object.freeze({
  GROUP_NAME: 80,
  GROUP_DESCRIPTION: 500,
  THREAD_CONTENT: 500,
  TOPIC_SUBMISSION_CONTENT: 2000,
});

function cleanText(value) {
  if (value == null) return '';
  return String(value);
}

function validateRequiredTrimmed(value, { field, maxLength }) {
  const text = cleanText(value).trim();
  if (!text) return { ok: false, error: `${field} is required` };
  if (text.length > maxLength) return { ok: false, error: `${field} too long` };
  return { ok: true, value: text };
}

function validateOptionalTrimmed(value, { maxLength }) {
  const text = cleanText(value).trim();
  if (text.length > maxLength) return { ok: false, error: 'Value too long' };
  return { ok: true, value: text };
}

module.exports = {
  INPUT_LIMITS,
  validateRequiredTrimmed,
  validateOptionalTrimmed,
};
