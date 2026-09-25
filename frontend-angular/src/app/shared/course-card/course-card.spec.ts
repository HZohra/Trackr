import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CourseCard } from './course-card';
import { Course } from '../../core/models/course';
import { CourseHealth } from '../../core/course-health';

const course: Course = {
  id: 1, code: 'CP322', name: 'Machine learning', professor: '', color: 'coral',
  currentGrade: 72, percentComplete: 25, archived: false,
};
const health = (patch: Partial<CourseHealth>): CourseHealth => ({
  trend: [80, 76, 72], target: { min: 70, letter: 'B-', points: 2.7 },
  needed: 69.3, maxPossible: 93, atRisk: false, ...patch,
});

describe('CourseCard', () => {
  let fixture: ComponentFixture<CourseCard>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(CourseCard);
    fixture.componentRef.setInput('course', course);
  });

  it('keeps the compact layout when no health is passed (courses page)', async () => {
    fixture.componentRef.setInput('nextLabel', 'Project 1');
    await fixture.whenStable();
    expect(text()).toContain('Next · Project 1');
    expect(text()).not.toContain('of grade decided');
  });

  it('shows trend, progress and what is needed', async () => {
    fixture.componentRef.setInput('health', health({}));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('polyline')).toBeTruthy();
    expect(text()).toContain('25% of grade decided');
    expect(text()).toContain('Need 70% on the rest to hold a B-');
  });

  it('says so when the band is out of reach', async () => {
    fixture.componentRef.setInput('health', health({ needed: 140, maxPossible: 61.4, atRisk: true }));
    await fixture.whenStable();
    expect(text()).toContain('B- is out of reach · best possible 61%');
  });
});