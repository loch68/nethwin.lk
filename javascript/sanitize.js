// Simple, fast HTML escaping for user-supplied content
// Replaces &, <, >, ", ' and `/` characters to prevent injection
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

// Safely set innerHTML by escaping the provided string
function safeHtml(str) {
  return escapeHtml(str);
}

// Expose globally
window.escapeHtml = escapeHtml;
window.safeHtml = safeHtml;


