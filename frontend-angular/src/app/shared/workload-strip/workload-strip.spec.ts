import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkloadStrip, WorkloadDay } from './workload-strip';

const monday = new Date(2026, 8, 21);
const week = (items: Record<number, WorkloadDay['items']>): WorkloadDay[] =>
  Array.from({ length: 7 }, (_, i) => ({
    date: new Date(monday.getTime() + i * 86_400_000), isToday: i === 0, items: items[i] ?? [],
  }));
const item = (id: number, weight: number, code = 'CP322') =>
  ({ id, name: `Item ${id}`, code, color: '#f00', weight });

describe('WorkloadStrip', () => {
  let fixture: ComponentFixture<WorkloadStrip>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WorkloadStrip], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(WorkloadStrip);
  });

  it('renders one clickable segment per item and totals per day', async () => {
    fixture.componentRef.setInput('days', week({ 1: [item(1, 25), item(2, 10, 'CP421')] }));
    await fixture.whenStable();
    expect(el().querySelectorAll('a.seg').length).toBe(2);
    expect(el().textContent).toContain('35%');
    expect(el().querySelectorAll('.legend span').length).toBe(2);
  });

  it('warns about a heavy item at least two days out, and suggests a start day', async () => {
    fixture.componentRef.setInput('days', week({ 4: [item(3, 30)] }));
    await fixture.whenStable();
    expect(el().querySelector('.warn')?.textContent).toContain('30% of your CP322 grade');
    expect(el().querySelector('.warn')?.textContent).toContain('by Wednesday');
  });

  it('does not warn about small or imminent items', async () => {
    fixture.componentRef.setInput('days', week({ 0: [item(4, 40)], 5: [item(5, 10)] }));
    await fixture.whenStable();
    expect(el().querySelector('.warn')).toBeNull();
  });
});