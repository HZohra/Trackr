import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  host: { '(document:click)': 'closeMenus()' },
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;
  protected readonly displayName = computed(() => {
    const u = this.user();
    return u ? `${u.first_name} ${u.last_name}` : 'User';
  });
  protected readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}` : '?';
  });

  protected readonly collapsed = signal(false);
  protected readonly addMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly chatOpen = signal(false);
  protected readonly chatExpanded = signal(false);

  protected toggleCollapsed(): void { this.collapsed.update((v) => !v); }
  protected toggleAddMenu(): void { this.userMenuOpen.set(false); this.addMenuOpen.update((v) => !v); }
  protected toggleUserMenu(): void { this.addMenuOpen.set(false); this.userMenuOpen.update((v) => !v); }
  protected toggleChat(): void { this.chatOpen.update((v) => !v); }
  protected toggleChatExpand(): void { this.chatExpanded.update((v) => !v); }
  protected closeMenus(): void { this.addMenuOpen.set(false); this.userMenuOpen.set(false); }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}