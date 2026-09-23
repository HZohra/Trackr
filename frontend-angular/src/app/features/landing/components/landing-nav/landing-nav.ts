import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-landing-nav',
  imports: [RouterLink],
  templateUrl: './landing-nav.html',
  styleUrl: './landing-nav.css',
})
export class LandingNav {
  private readonly themeService = inject(ThemeService);

  protected readonly isDark = computed(
    () => this.themeService.theme() === 'dark',
  );

  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);

  protected toggleTheme(): void {
    this.themeService.toggle();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  protected scrollTo(sectionId: string): void {
    this.closeMenu();

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}