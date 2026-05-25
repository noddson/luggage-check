export function metricCard(label, value, description, className = '') {
  const article = document.createElement('article');
  article.className = `metric ${className}`.trim();
  article.innerHTML = `<small>${label}</small><strong>${value}</strong><span>${description}</span>`;
  return article;
}
