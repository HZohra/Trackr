import { Activity } from './models/activity';
import { priorityScore, rankPending, priorityReason, isOpen } from './priority';

const HOUR = 3_600_000;
const NOW = new Date('2026-10-01T12:00:00Z').getTime();

let nextId = 1;
function act(hoursFromNow: number, weight: number | null, extra: Partial<Activity> = {}): Activity {
  return {
    activity_id: nextId++,
    course_id: 1,
    activity_category_id: 1,
    activity_name: `a${nextId}`,
    due_date: new Date(NOW + hoursFromNow * HOUR).toISOString(),
    grading_weight: weight,
    grade: null,
    status: 'pending',
    ...extra,
  };
}

describe('priorityScore', () => {
  it('is continuous at the deadline', () => {
    const justBefore = priorityScore(act(0.001, 10), NOW);
    const justAfter = priorityScore(act(-0.001, 10), NOW);
    expect(Math.abs(justBefore - justAfter)).toBeLessThan(0.01);
  });

  it('decays overdue items over time', () => {
    expect(priorityScore(act(-2, 10), NOW)).toBeGreaterThan(priorityScore(act(-72, 10), NOW));
  });

  it('treats missing or invalid dates as lowest priority', () => {
    expect(priorityScore(act(0, 10, { due_date: null }), NOW)).toBe(-Infinity);
    expect(priorityScore(act(0, 10, { due_date: 'nope' }), NOW)).toBe(-Infinity);
  });
});

describe('rankPending', () => {
  it('does not let a long-abandoned overdue item beat an exam tomorrow', () => {
    const staleQuiz = act(-21 * 24, 5);
    const examTomorrow = act(24, 30);
    expect(rankPending([staleQuiz, examTomorrow], NOW)[0]).toBe(examTomorrow);
  });

  it('still surfaces something that just went overdue', () => {
    const justLate = act(-1, 20);
    const nextWeek = act(7 * 24, 20);
    expect(rankPending([nextWeek, justLate], NOW)[0]).toBe(justLate);
  });

  it('drops submitted and graded work', () => {
    const done = act(5, 10, { status: 'submitted' });
    const graded = act(5, 10, { grade: 90 });
    expect(rankPending([done, graded], NOW)).toEqual([]);
    expect(isOpen(done)).toBe(false);
  });
});

describe('priorityReason', () => {
  it('labels overdue, soonest, and highest-impact correctly', () => {
    const late = act(-1, 10);
    const soon = act(2, 1);
    const big = act(10, 40);
    expect(priorityReason(late, [late, soon, big], NOW)).toBe('overdue');
    expect(priorityReason(soon, [soon, big], NOW)).toBe('due-soonest');
    expect(priorityReason(big, [soon, big], NOW)).toBe('highest-impact');
  });
});