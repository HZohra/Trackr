import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { ActivityService } from '../../core/services/activity.service';
import { CourseService } from '../../core/services/course.service';
import { CalendarEventService } from '../../core/services/calendar-event.service';

import {
  CalendarConnectionStatus,
  CalendarIntegrationService,
} from '../../core/services/calendar-integration.service';

import {
  Activity,
  CATEGORY_ID_TO_NAME,
} from '../../core/models/activity';

import {
  Course,
  COURSE_COLORS,
} from '../../core/models/course';


type View = 'month' | 'week';


interface DayItem {
  uid: string;
  kind: 'activity' | 'event';
  refId: number | string;
  courseId: number | null;
  name: string;
  typeLabel: string;
  color: string;
  date: Date;
  time: string | null;
  graded: boolean;
  overdue: boolean;
}


interface DayCell {
  key: string;
  day: number;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  items: DayItem[];
}


interface WeekDay {
  label: string;
  day: number;
  count: number;
  isToday: boolean;
}


interface Filters {
  assignments: boolean;
  other: boolean;
  completed: boolean;
}


const TASK_TYPES: {
  value: string;
  label: string;
  categoryId: number | null;
}[] = [
  {
    value: 'assignment',
    label: 'Assignment',
    categoryId: 1,
  },
  {
    value: 'quiz',
    label: 'Quiz',
    categoryId: 2,
  },
  {
    value: 'exam',
    label: 'Exam',
    categoryId: 3,
  },
  {
    value: 'project',
    label: 'Project',
    categoryId: 4,
  },
  {
    value: 'lab',
    label: 'Lab',
    categoryId: 5,
  },
  {
    value: 'other',
    label: 'Other',
    categoryId: null,
  },
];


@Component({
  selector: 'app-calendar',
  imports: [
    RouterLink,
    ReactiveFormsModule,
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {

  // ============================================================
  // SERVICES
  // ============================================================

  private readonly activityService =
    inject(ActivityService);

  private readonly courseService =
    inject(CourseService);

  private readonly calendarEvents =
    inject(CalendarEventService);

  private readonly calendarIntegration =
    inject(CalendarIntegrationService);

  private readonly fb =
    inject(FormBuilder);


  // ============================================================
  // PAGE STATE
  // ============================================================

  protected readonly loading =
    signal(true);

  protected readonly error =
    signal<string | null>(null);

  protected readonly courses =
    signal<Course[]>([]);

  private readonly activities =
    signal<Activity[]>([]);

  protected readonly events =
    this.calendarEvents.events;


  // ============================================================
  // EXTERNAL CALENDAR INTEGRATION
  // ============================================================

  protected readonly calendarConnections =
    signal<CalendarConnectionStatus | null>(null);

  protected readonly connectingGoogle =
    signal(false);

  protected readonly googleConnectError =
    signal<string | null>(null);

  protected readonly syncingGoogle =
    signal(false);

  protected readonly googleSyncMessage =
    signal<string | null>(null);

  protected readonly googleSyncError =
    signal<string | null>(null);

  protected readonly showCalendarSync =
    signal(false);

  protected readonly disconnectingGoogle =
  signal(false);

  protected readonly googleDisconnectError =
    signal<string | null>(null);

  protected readonly googleDisconnectMessage =
    signal<string | null>(null);

  protected readonly showGoogleDisconnectConfirm =
  signal(false);

  // ============================================================
  // CALENDAR VIEW STATE
  // ============================================================

  protected readonly weekdays = [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ];

  protected readonly taskTypes =
    TASK_TYPES;

  protected readonly view =
    signal<View>('month');

  protected readonly cursor =
    signal<Date>(new Date());

  protected readonly filters =
    signal<Filters>({
      assignments: true,
      other: true,
      completed: true,
    });


  // ============================================================
  // DAY PANEL / ADD TASK
  // ============================================================

  protected readonly selected =
    signal<Date | null>(null);

  protected readonly saving =
    signal(false);

  protected readonly addError =
    signal<string | null>(null);

  protected readonly addForm =
    this.fb.nonNullable.group({
      type: ['assignment'],
      title: [
        '',
        [Validators.required],
      ],
      courseId: [0],
      weight: [0],
      time: [''],
    });


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  constructor() {
    forkJoin({
      activities:
        this.activityService.getAllActivities(),

      courses:
        this.courseService.getCourses(),

      calendarEvents:
        this.calendarEvents.load(),
    }).subscribe({
      next: ({
        activities,
        courses,
      }) => {
        this.activities.set(
          activities,
        );

        this.courses.set(
          courses,
        );

        // CalendarEventService.load()
        // updates its own events signal.
        this.loading.set(false);
      },

      error: (err) => {
        console.error(
          'Could not load calendar:',
          err,
        );

        this.error.set(
          'Could not load your calendar.',
        );

        this.loading.set(false);
      },
    });

    this.saveBrowserTimezone();
    this.loadCalendarConnections();

  }


  // ============================================================
  // CALENDAR INTEGRATIONS
  // ============================================================

  private loadCalendarConnections(): void {
    this.calendarIntegration
      .getConnections()
      .subscribe({
        next: (connections) => {
          this.calendarConnections.set(
            connections,
          );
        },

        error: (err) => {
          console.error(
            'Could not load calendar integrations:',
            err,
          );
        },
      });
  }


  protected toggleCalendarSync(): void {
    this.showCalendarSync.update(
      (open) => !open,
    );
  }


  protected closeCalendarSync(): void {
    this.showCalendarSync.set(
      false,
    );
  }


  protected connectGoogleCalendar(): void {
    if (
      this.connectingGoogle()
    ) {
      return;
    }

    this.connectingGoogle.set(
      true,
    );

    this.googleConnectError.set(
      null,
    );

    this.calendarIntegration
      .connectGoogle()
      .subscribe({
        next: ({
          authorizationUrl,
        }) => {
          if (
            !authorizationUrl
          ) {
            this.connectingGoogle.set(
              false,
            );

            this.googleConnectError.set(
              'Google authorization URL was not returned.',
            );

            return;
          }

          window.location.href =
            authorizationUrl;
        },

        error: (err) => {
          console.error(
            'Could not connect Google Calendar:',
            err,
          );

          this.connectingGoogle.set(
            false,
          );

          this.googleConnectError.set(
            err?.error?.message ??
              'Could not connect Google Calendar.',
          );
        },
      });
  }


  protected syncGoogleCalendar(): void {
    if (
      this.syncingGoogle()
    ) {
      return;
    }

    this.syncingGoogle.set(
      true,
    );

    this.googleSyncMessage.set(
      null,
    );

    this.googleSyncError.set(
      null,
    );

    this.calendarIntegration
      .syncGoogle()
      .subscribe({
        next: (result) => {
          this.syncingGoogle.set(
            false,
          );

          this.googleSyncMessage.set(
            `Sync complete — ${result.created} created, ` +
            `${result.updated} updated, ` +
            `${result.deleted} removed, ` +
            `${result.unchanged} already up to date.`,
          );

          this.loadCalendarConnections();
        },

        error: (err) => {
          console.error(
            'Google Calendar sync failed:',
            err,
          );

          this.syncingGoogle.set(
            false,
          );

          this.googleSyncError.set(
            err?.error?.message ??
              'Could not sync Google Calendar.',
          );
        },
      });
  }

protected requestGoogleDisconnect(): void {
  if (
    this.disconnectingGoogle() ||
    this.syncingGoogle()
  ) {
    return;
  }

  this.googleDisconnectError.set(null);

  this.showGoogleDisconnectConfirm.set(true);
}


protected cancelGoogleDisconnect(): void {
  this.showGoogleDisconnectConfirm.set(false);
}


protected disconnectGoogleCalendar(): void {

  if (this.disconnectingGoogle()) {
    return;
  }

  this.showGoogleDisconnectConfirm.set(false);

  this.disconnectingGoogle.set(true);

  this.googleDisconnectError.set(null);

  this.googleDisconnectMessage.set(null);

  this.googleSyncMessage.set(null);

  this.googleSyncError.set(null);


  this.calendarIntegration
    .disconnectGoogle()
    .subscribe({

      next: (result) => {

        this.disconnectingGoogle.set(false);

        this.googleDisconnectMessage.set(
          result.message,
        );

        this.loadCalendarConnections();
      },


      error: (err) => {

        console.error(
          'Could not disconnect Google Calendar:',
          err,
        );

        this.disconnectingGoogle.set(false);

        this.googleDisconnectError.set(
          err?.error?.message ??
            'Could not disconnect Google Calendar.',
        );
      },

    });
}


  // ============================================================
  // CURRENT PERIOD
  // ============================================================

  private readonly monthAnchor =
    computed(() =>
      this.firstOfMonth(
        this.cursor(),
      ),
    );


  private readonly weekStart =
    computed(() => {
      const c =
        this.cursor();

      const s =
        new Date(c);

      s.setDate(
        c.getDate() -
          c.getDay(),
      );

      s.setHours(
        0,
        0,
        0,
        0,
      );

      return s;
    });


  protected readonly periodLabel =
    computed(() => {
      if (
        this.view() ===
        'month'
      ) {
        return this.monthAnchor()
          .toLocaleDateString(
            undefined,
            {
              month: 'long',
              year: 'numeric',
            },
          );
      }

      const s =
        this.weekStart();

      const e =
        new Date(s);

      e.setDate(
        s.getDate() + 6,
      );

      const left =
        s.toLocaleDateString(
          undefined,
          {
            month: 'short',
            day: 'numeric',
          },
        );

      const right =
        e.toLocaleDateString(
          undefined,
          s.getMonth() ===
          e.getMonth()
            ? {
                day: 'numeric',
              }
            : {
                month: 'short',
                day: 'numeric',
              },
        );

      return `${left} – ${right}, ${e.getFullYear()}`;
    });


  // ============================================================
  // ALL CALENDAR ITEMS
  // ============================================================

  private readonly allItems =
    computed<DayItem[]>(() => {
      const now =
        new Date();

      const out:
        DayItem[] = [];


      // --------------------------------------------------------
      // COURSE ACTIVITIES
      // --------------------------------------------------------

      for (
        const a of
        this.activities()
      ) {
        if (
          !a.due_date
        ) {
          continue;
        }

        const d =
          new Date(
            a.due_date,
          );

        if (
          Number.isNaN(
            d.getTime(),
          )
        ) {
          continue;
        }

        const graded =
          a.grade != null;

        out.push({
          uid:
            `a${a.activity_id}`,

          kind:
            'activity',

          refId:
            a.activity_id,

          courseId:
            a.course_id,

          name:
            a.activity_name,

          typeLabel:
            CATEGORY_ID_TO_NAME[
              a.activity_category_id
            ] ?? '',

          color:
            this.colorOf(
              a.course_id,
            ),

          date:
            d,

          time:
            this.timeOf(
              d,
            ),

          graded,

          overdue:
            !graded &&
            d.getTime() <
              now.getTime(),
        });
      }


      // --------------------------------------------------------
      // CALENDAR-ONLY EVENTS
      // --------------------------------------------------------

      for (
        const e of
        this.events()
      ) {
        const d =
          new Date(
            `${e.date}T00:00:00`,
          );

        if (
          Number.isNaN(
            d.getTime(),
          )
        ) {
          continue;
        }

        out.push({
          uid:
            `e${e.id}`,

          kind:
            'event',

          refId:
            e.id,

          courseId:
            null,

          name:
            e.title,

          typeLabel:
            'Other',

          color:
            'var(--muted)',

          date:
            d,

          time:
            e.time,

          graded:
            false,

          overdue:
            false,
        });
      }

      return out;
    });


  // ============================================================
  // FILTERING
  // ============================================================

  private passesFilter(
    item: DayItem,
  ): boolean {
    const filters =
      this.filters();

    if (
      item.kind ===
        'activity' &&
      !filters.assignments
    ) {
      return false;
    }

    if (
      item.kind ===
        'event' &&
      !filters.other
    ) {
      return false;
    }

    if (
      item.graded &&
      !filters.completed
    ) {
      return false;
    }

    return true;
  }


  private readonly itemsByDay =
    computed(() =>
      this.bucket(
        this.allItems(),
      ),
    );


  private readonly visibleByDay =
    computed(() =>
      this.bucket(
        this.allItems()
          .filter(
            (item) =>
              this.passesFilter(
                item,
              ),
          ),
      ),
    );


  private bucket(
    items: DayItem[],
  ): Map<string, DayItem[]> {
    const map =
      new Map<
        string,
        DayItem[]
      >();

    for (
      const item of
      items
    ) {
      const key =
        this.dateKey(
          item.date,
        );

      const existing =
        map.get(key);

      if (existing) {
        existing.push(
          item,
        );
      } else {
        map.set(
          key,
          [item],
        );
      }
    }

    return map;
  }


  // ============================================================
  // MONTH VIEW
  // ============================================================

  protected readonly weeks =
    computed<DayCell[][]>(() => {
      const first =
        this.monthAnchor();

      const start =
        new Date(first);

      start.setDate(
        first.getDate() -
          first.getDay(),
      );

      const today =
        new Date();

      const byDay =
        this.visibleByDay();

      const cells:
        DayCell[] = [];

      for (
        let i = 0;
        i < 42;
        i++
      ) {
        const date =
          new Date(start);

        date.setDate(
          start.getDate() +
            i,
        );

        const key =
          this.dateKey(
            date,
          );

        cells.push({
          key,

          day:
            date.getDate(),

          date,

          inMonth:
            date.getMonth() ===
            first.getMonth(),

          isToday:
            this.sameDay(
              date,
              today,
            ),

          items:
            byDay.get(
              key,
            ) ?? [],
        });
      }

      const weeks:
        DayCell[][] = [];

      for (
        let i = 0;
        i < 42;
        i += 7
      ) {
        weeks.push(
          cells.slice(
            i,
            i + 7,
          ),
        );
      }

      return weeks;
    });


  // ============================================================
  // WEEK VIEW
  // ============================================================

  protected readonly weekDays =
    computed<DayCell[]>(() => {
      const start =
        this.weekStart();

      const today =
        new Date();

      const byDay =
        this.visibleByDay();

      const days:
        DayCell[] = [];

      for (
        let i = 0;
        i < 7;
        i++
      ) {
        const date =
          new Date(start);

        date.setDate(
          start.getDate() +
            i,
        );

        const key =
          this.dateKey(
            date,
          );

        days.push({
          key,

          day:
            date.getDate(),

          date,

          inMonth:
            true,

          isToday:
            this.sameDay(
              date,
              today,
            ),

          items:
            byDay.get(
              key,
            ) ?? [],
        });
      }

      return days;
    });


  // ============================================================
  // SELECTED DAY
  // ============================================================

  protected readonly selectedItems =
    computed<DayItem[]>(() => {
      const d =
        this.selected();

      if (!d) {
        return [];
      }

      const items =
        this.itemsByDay()
          .get(
            this.dateKey(
              d,
            ),
          ) ?? [];

      return [
        ...items,
      ].sort(
        (
          a,
          b,
        ) =>
          (
            a.time ??
            '99'
          ).localeCompare(
            b.time ??
              '99',
          ),
      );
    });


  protected readonly selectedLabel =
    computed(() => {
      const d =
        this.selected();

      return d
        ? d.toLocaleDateString(
            undefined,
            {
              weekday:
                'long',
              month:
                'long',
              day:
                'numeric',
            },
          )
        : '';
    });


  // ============================================================
  // UPCOMING
  // ============================================================

  protected readonly upcoming =
    computed<DayItem[]>(() => {
      const start =
        new Date();

      start.setHours(
        0,
        0,
        0,
        0,
      );

      return this.allItems()
        .filter(
          (item) =>
            this.passesFilter(
              item,
            ) &&
            item.date.getTime() >=
              start.getTime(),
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.date.getTime() -
            b.date.getTime(),
        )
        .slice(
          0,
          6,
        );
    });


  // ============================================================
  // THIS WEEK
  // ============================================================

  protected readonly thisWeek =
    computed<WeekDay[]>(() => {
      const today =
        new Date();

      const start =
        new Date(today);

      start.setDate(
        today.getDate() -
          today.getDay(),
      );

      start.setHours(
        0,
        0,
        0,
        0,
      );

      const visible =
        this.visibleByDay();

      const days:
        WeekDay[] = [];

      for (
        let i = 0;
        i < 7;
        i++
      ) {
        const d =
          new Date(start);

        d.setDate(
          start.getDate() +
            i,
        );

        days.push({
          label:
            this.weekdays[i],

          day:
            d.getDate(),

          count:
            (
              visible.get(
                this.dateKey(
                  d,
                ),
              ) ?? []
            ).length,

          isToday:
            this.sameDay(
              d,
              today,
            ),
        });
      }

      return days;
    });


  // ============================================================
  // NAVIGATION / VIEWS / FILTERS
  // ============================================================

  protected setView(
    view: View,
  ): void {
    this.view.set(
      view,
    );
  }


  protected prev(): void {
    const c =
      this.cursor();

    if (
      this.view() ===
      'month'
    ) {
      this.cursor.set(
        new Date(
          c.getFullYear(),
          c.getMonth() - 1,
          1,
        ),
      );

      return;
    }

    const d =
      new Date(c);

    d.setDate(
      c.getDate() - 7,
    );

    this.cursor.set(
      d,
    );
  }


  protected next(): void {
    const c =
      this.cursor();

    if (
      this.view() ===
      'month'
    ) {
      this.cursor.set(
        new Date(
          c.getFullYear(),
          c.getMonth() + 1,
          1,
        ),
      );

      return;
    }

    const d =
      new Date(c);

    d.setDate(
      c.getDate() + 7,
    );

    this.cursor.set(
      d,
    );
  }


  protected goToday(): void {
    this.cursor.set(
      new Date(),
    );
  }


  protected toggleFilter(
    key: keyof Filters,
  ): void {
    this.filters.update(
      (filters) => ({
        ...filters,
        [key]:
          !filters[key],
      }),
    );
  }




  // ============================================================
  // DAY PANEL
  // ============================================================

  protected openDate(
    date: Date,
  ): void {
    this.selected.set(
      date,
    );

    this.addError.set(
      null,
    );

    this.resetAdd();
  }


  protected closeDay(): void {
    this.selected.set(
      null,
    );
  }


  protected courseCode(
    courseId:
      number | null,
  ): string {
    if (
      courseId == null
    ) {
      return '';
    }

    return (
      this.courses()
        .find(
          (course) =>
            course.id ===
            courseId,
        )
        ?.code ?? ''
    );
  }


  protected dateLabel(
    date: Date,
  ): string {
    return date.toLocaleDateString(
      undefined,
      {
        month:
          'short',
        day:
          'numeric',
      },
    );
  }


  // ============================================================
  // ADD TASK / EVENT
  // ============================================================

  protected submitAdd(): void {
    const selectedDate =
      this.selected();

    if (
      !selectedDate
    ) {
      return;
    }

    const values =
      this.addForm
        .getRawValue();

    const title =
      values.title.trim();

    if (!title) {
      this.addForm
        .controls
        .title
        .markAsTouched();

      return;
    }

    const chosen =
      TASK_TYPES.find(
        (type) =>
          type.value ===
          values.type,
      ) ??
      TASK_TYPES[0];

    this.addError.set(
      null,
    );

    const dateStr =
      this.fmtDate(
        selectedDate,
      );


    // ----------------------------------------------------------
    // COURSE ACTIVITY
    // ----------------------------------------------------------

    if (
      chosen.categoryId !=
      null
    ) {
      if (
        Number(
          values.courseId,
        ) < 1
      ) {
        this.addError.set(
          'Pick a course for this item.',
        );

        return;
      }

      this.saving.set(
        true,
      );

      this.activityService
        .addActivity({
          courseId:
            Number(
              values.courseId,
            ),

          categoryId:
            chosen.categoryId,

          name:
            title,

          dueDate:
            `${dateStr} ${values.time || '23:59'}`,

          weight:
            Number(
              values.weight,
            ),
        })
        .subscribe({
          next: () => {
            this.reloadActivities(
              () => {
                this.saving.set(
                  false,
                );

                this.resetAdd();
              },
            );
          },

          error: (err) => {
            this.saving.set(
              false,
            );

            this.addError.set(
              err?.error?.errors?.[0] ??
                err?.error?.message ??
                'Could not add this item.',
            );
          },
        });

      return;
    }


    // ----------------------------------------------------------
    // CALENDAR-ONLY EVENT
    // ----------------------------------------------------------

    this.saving.set(
      true,
    );

    this.calendarEvents
      .add({
        title,

        date:
          dateStr,

        time:
          values.time ||
          null,
      })
      .subscribe({
        next: () => {
          this.saving.set(
            false,
          );

          this.resetAdd();
        },

        error: (err) => {
          console.error(
            'Could not add calendar event:',
            err,
          );

          this.saving.set(
            false,
          );

          this.addError.set(
            err?.error?.message ??
              'Could not add this calendar event.',
          );
        },
      });
  }


  // ============================================================
  // REMOVE CALENDAR-ONLY EVENT
  // ============================================================

  protected removeEvent(
    id:
      number |
      string,
  ): void {
    const eventId =
      Number(id);

    if (
      !Number.isInteger(
        eventId,
      ) ||
      eventId < 1
    ) {
      return;
    }

    this.calendarEvents
      .remove(
        eventId,
      )
      .subscribe({
        error: (err) => {
          console.error(
            'Could not remove calendar event:',
            err,
          );
        },
      });
  }


  // ============================================================
  // RELOAD COURSE ACTIVITIES
  // ============================================================

  private reloadActivities(
    done: () => void,
  ): void {
    this.activityService
      .getAllActivities()
      .subscribe({
        next: (
          activities,
        ) => {
          this.activities.set(
            activities,
          );

          done();
        },

        error: () => {
          done();
        },
      });
  }


  // ============================================================
  // RESET ADD FORM
  // ============================================================

  private resetAdd(): void {
    this.addForm.reset({
      type:
        'assignment',

      title:
        '',

      courseId:
        0,

      weight:
        0,

      time:
        '',
    });
  }


  // ============================================================
  // HELPERS
  // ============================================================

  private firstOfMonth(
    date: Date,
  ): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
    );
  }


  private dateKey(
    date: Date,
  ): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }


  private fmtDate(
    date: Date,
  ): string {
    return `${date.getFullYear()}-${this.pad(
      date.getMonth() + 1,
    )}-${this.pad(
      date.getDate(),
    )}`;
  }


  private timeOf(
    date: Date,
  ): string {
    return `${this.pad(
      date.getHours(),
    )}:${this.pad(
      date.getMinutes(),
    )}`;
  }


  private pad(
    number: number,
  ): string {
    return number < 10
      ? `0${number}`
      : `${number}`;
  }


  private sameDay(
    a: Date,
    b: Date,
  ): boolean {
    return (
      a.getFullYear() ===
        b.getFullYear() &&
      a.getMonth() ===
        b.getMonth() &&
      a.getDate() ===
        b.getDate()
    );
  }

  private saveBrowserTimezone(): void {

  const timezone =
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone;


  if (!timezone) {
    console.warn(
      'Browser timezone could not be detected.',
    );

    return;
  }


  this.calendarIntegration
    .saveTimezone(timezone)
    .subscribe({

      next: (result) => {

        console.log(
          'Trackr timezone:',
          result.timezone,
        );

      },


      error: (err) => {

        console.error(
          'Could not save Trackr timezone:',
          err,
        );

      },

    });
}


  private colorOf(
    courseId: number,
  ): string {
    const course =
      this.courses()
        .find(
          (item) =>
            item.id ===
            courseId,
        );

    return course
      ? COURSE_COLORS[
          course.color
        ]
      : 'var(--muted)';
  }
}