/* Animated progress bar. Renders at width:0 with data-w; the page sets the
   real width after mount to trigger the CSS transition. */
export function progressBar(percent, opts = {}) {
  const cls = opts.color ? ` style="--pb:var(--course-${opts.color})"` : '';
  return `<div class="pbar"${cls}><i data-w="${Math.max(0, Math.min(100, percent))}"></i></div>`;
}