import { Component, inject } from '@angular/core';
import { ThemeService, Theme, AccentId } from '../../core/services/theme.service';
import { GpaService } from '../../core/services/gpa.service';
import { GpaScaleId, GradeBand } from '../../core/gpa';

@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly themeService = inject(ThemeService);
  private readonly gpaService = inject(GpaService);

  protected readonly theme = this.themeService.theme;
  protected readonly accent = this.themeService.accent;
  protected readonly accents = this.themeService.accents;
  protected readonly customHue = this.themeService.customHue;

  protected readonly scaleOptions = this.gpaService.scaleOptions;
  protected readonly gpaScaleId = this.gpaService.scaleId;
  protected readonly customBands = this.gpaService.customBands;

  protected setTheme(t: Theme): void { this.themeService.setTheme(t); }
  protected setAccent(id: AccentId): void { this.themeService.setAccent(id); }
  protected setCustomHue(hue: number): void { this.themeService.setCustomHue(hue); }
  protected swatch(id: AccentId): string { return this.themeService.shadesFor(id).brand; }
  protected customSwatch(): string { return this.themeService.shadesFor('custom').brand; }

  protected setGpaScale(id: GpaScaleId): void { this.gpaService.setScale(id); }
  protected updateBand(i: number, patch: Partial<GradeBand>): void { this.gpaService.updateBand(i, patch); }
  protected addBand(): void { this.gpaService.addBand(); }
  protected removeBand(i: number): void { this.gpaService.removeBand(i); }
  protected resetCustom(): void { this.gpaService.resetCustom(); }
}