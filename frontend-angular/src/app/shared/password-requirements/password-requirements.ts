import { Component, computed, input } from '@angular/core';
import { passwordRequirements } from '../../core/password-policy';

@Component({
  selector: 'app-password-requirements',
  imports: [],
  templateUrl: './password-requirements.html',
})
export class PasswordRequirements {
  readonly value = input<string>('');

  protected readonly items = computed(() => {
    const v = this.value() ?? '';
    return passwordRequirements.map((r) => ({ label: r.label, met: r.test(v) }));
  });
}