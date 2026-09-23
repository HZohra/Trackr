import {
  Component,
  HostListener,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-nav',
  imports: [RouterLink],
  templateUrl: './landing-nav.html',
  styleUrl: './landing-nav.css',
})
export class LandingNav {
  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  scrollTo(sectionId: string): void {
    this.closeMenu();

    document
      .getElementById(sectionId)
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  }
}