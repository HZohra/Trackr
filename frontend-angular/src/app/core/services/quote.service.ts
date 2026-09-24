import { Injectable } from '@angular/core';

export interface DailyQuote { q: string; by?: string; }

const QUOTES: DailyQuote[] = [
  { q: 'Small steps every day add up to big results.' },
  { q: 'You don\u2019t have to be great to start, but you have to start to be great.', by: 'Zig Ziglar' },
  { q: 'The secret of getting ahead is getting started.', by: 'Mark Twain' },
  { q: 'Discipline is choosing between what you want now and what you want most.' },
  { q: 'It always seems impossible until it\u2019s done.', by: 'Nelson Mandela' },
  { q: 'Focus on progress, not perfection.' },
  { q: 'A little progress each day adds up to big results.' },
  { q: 'Success is the sum of small efforts repeated day in and day out.', by: 'Robert Collier' },
  { q: 'Don\u2019t watch the clock; do what it does. Keep going.', by: 'Sam Levenson' },
  { q: 'The expert in anything was once a beginner.' },
  { q: 'Study while others are sleeping; work while others are loafing.', by: 'William A. Ward' },
  { q: 'Your future is created by what you do today, not tomorrow.' },
  { q: 'Push yourself, because no one else is going to do it for you.' },
  { q: 'Great things never come from comfort zones.' },
  { q: 'The difference between ordinary and extraordinary is that little extra.' },
  { q: 'Motivation gets you started; habit keeps you going.', by: 'Jim Ryun' },
  { q: 'One page at a time still finishes the book.' },
  { q: 'Believe you can and you\u2019re halfway there.', by: 'Theodore Roosevelt' },
  { q: 'Done is better than perfect.' },
  { q: 'The best way out is always through.', by: 'Robert Frost' },
  { q: 'Little by little, one travels far.', by: 'J.R.R. Tolkien' },
  { q: 'Energy and persistence conquer all things.', by: 'Benjamin Franklin' },
  { q: 'Start where you are. Use what you have. Do what you can.', by: 'Arthur Ashe' },
  { q: 'The future depends on what you do today.', by: 'Mahatma Gandhi' },
  { q: 'Quality is not an act, it is a habit.', by: 'Aristotle' },
  { q: 'Work hard in silence; let your results make the noise.' },
  { q: 'You are capable of more than you know.' },
  { q: 'Fall seven times, stand up eight.' },
  { q: 'Consistency is what transforms average into excellence.' },
  { q: 'Slow progress is still progress.' },
  { q: 'Do something today that your future self will thank you for.' },
  { q: 'The only way to finish is to begin.' },
  { q: 'Study the past if you would define the future.', by: 'Confucius' },
  { q: 'Deadlines are just the universe\u2019s way of saying \u201cnow.\u201d' },
  { q: 'One assignment at a time. You\u2019ve got this.' },
];

@Injectable({ providedIn: 'root' })
export class QuoteService {
  quoteOfTheDay(): DailyQuote {
    const start = new Date(new Date().getFullYear(), 0, 0).getTime();
    const day = Math.floor((Date.now() - start) / 86_400_000);
    return QUOTES[day % QUOTES.length];
  }
}