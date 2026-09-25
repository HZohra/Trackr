import { Activity } from './models/activity';
import { courseHealth } from './course-health';
import { scaleById } from './gpa';

const scale = scaleById('gpa4');
let id = 1;
const act = (weight: number | null, grade: number | null, day = id): Activity => ({
  activity_id: id++, course_id: 1, activity_category_id: 1, activity_name: `a${id}`,
  due_date: new Date(2026, 8, day).toISOString(), grading_weight: weight, grade, status: 'pending',
});

describe('courseHealth', () => {
  it('returns no target until something is graded', () => {
    const h = courseHealth([act(50, null), act(50, null)], scale);
    expect(h.target).toBeNull();
    expect(h.needed).toBeNull();
  });

  it('computes what is needed on the rest to hold the current band', () => {
    // 40% graded at 88 → in the A band (85). Need (85*100 - 88*40) / 60 = 83.
    const h = courseHealth([act(40, 88), act(60, null)], scale);
    expect(h.target?.letter).toBe('A');
    expect(h.needed).toBeCloseTo(83, 5);
    expect(h.atRisk).toBe(false);
  });

  it('flags risk when the target needs 90%+ or is out of reach', () => {
    // 80% graded at 81 → A- (80). Need (80*100 - 81*80)/20 = 76 → fine.
    expect(courseHealth([act(80, 81), act(20, null)], scale).atRisk).toBe(false);
    // 90% graded at 40 → failing, so the target becomes D- (50), which is out of reach.
    const h = courseHealth([act(90, 40), act(10, null)], scale);
    expect(h.target?.letter).toBe('D-');
    expect(h.atRisk).toBe(true);
    expect(h.maxPossible).toBeCloseTo(46, 5);
  });

  it('builds a running-grade trend in due-date order', () => {
    const h = courseHealth([act(10, 60, 5), act(10, 100, 1)], scale);
    expect(h.trend.map(Math.round)).toEqual([100, 80]);
  });

  it('ignores unweighted activities in the math', () => {
    const h = courseHealth([act(null, 10), act(50, 90), act(50, null)], scale);
    expect(h.needed).toBeCloseTo(90, 5);
  });
});