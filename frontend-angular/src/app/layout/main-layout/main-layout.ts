import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  host: { '(document:click)': 'closeMenus()' },
})
export class MainLayout {
  protected readonly collapsed = signal(false);
  protected readonly addMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly chatOpen = signal(false);
  protected readonly chatExpanded = signal(false);

  protected toggleCollapsed(): void {
    this.collapsed.update((open) => !open);
  }

  protected toggleAddMenu(): void {
    this.userMenuOpen.set(false);
    this.addMenuOpen.update((open) => !open);
  }

  protected toggleUserMenu(): void {
    this.addMenuOpen.set(false);
    this.userMenuOpen.update((open) => !open);
  }

  protected toggleChat(): void {
    this.chatOpen.update((open) => !open);
  }

  protected toggleChatExpand(): void {
    this.chatExpanded.update((big) => !big);
  }

  protected closeMenus(): void {
    this.addMenuOpen.set(false);
    this.userMenuOpen.set(false);
  }
}