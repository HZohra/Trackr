export function statCard({ icon, value, suffix = '', label, sub, accent = 'primary', countup = false, trend }) {
  const trendHtml = trend
    ? `<span class="stat__trend ${trend.dir === 'up' ? 'is-up' : 'is-down'}">${trend.dir === 'up' ? '↑' : '↓'} ${trend.text}</span>`
    : '';
  const valAttr = countup ? ` data-countup="${value}" data-suffix="${suffix}"` : '';
  return `
    <article class="stat">
      <div class="stat__top">
        <span class="stat__ic stat__ic--${accent}">${icon}</span>
        ${trendHtml}
      </div>
      <div class="stat__value"${valAttr}>${value}${suffix}</div>
      <div class="stat__label">${label}</div>
      ${sub ? `<div class="stat__sub">${sub}</div>` : ''}
    </article>`;
}
export function statCardSkeleton() {
  return `<article class="stat"><div class="stat__top"><span class="sk sk--ic"></span></div>
    <div class="sk sk--num"></div><div class="sk sk--line"></div></article>`;
}