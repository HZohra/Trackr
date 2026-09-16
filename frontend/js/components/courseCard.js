import { progressBar } from './progressBar.js';
import { paramLink } from '../url.js';
export function courseCard(c) {
  return `
    <a class="ccard" href="${paramLink('courses.html', 'id', c.id)}" style="--c:var(--course-${c.color})">
      <span class="ccard__accent"></span>
      <div class="ccard__head">
        <span class="ccard__code">${c.code}</span>
        <span class="ccard__grade">${c.currentGrade == null ? '—' : c.currentGrade + '%'}</span>
      </div>
      <h4 class="ccard__name">${c.name}</h4>
      <p class="ccard__prof">${c.professor}</p>
      <div class="ccard__foot">
        ${progressBar(c.percentComplete, { color: c.color })}
        <span class="ccard__pct">${c.percentComplete}% complete</span>
      </div>
    </a>`;
}
export function courseCardSkeleton() {
  return `<div class="ccard"><span class="ccard__accent"></span>
    <div class="ccard__head"><span class="sk sk--chip"></span><span class="sk sk--chip sk--sm"></span></div>
    <div class="sk sk--line" style="width:80%;margin:.6rem 0 .4rem"></div>
    <div class="sk sk--line sk--sm" style="width:50%"></div>
    <div class="sk sk--bar" style="margin-top:1rem"></div></div>`;
}