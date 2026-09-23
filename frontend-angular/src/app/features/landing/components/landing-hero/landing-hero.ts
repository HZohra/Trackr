import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-hero',
  imports: [RouterLink],
  templateUrl: './landing-hero.html',
  styleUrl: './landing-hero.css',
})
export class LandingHero {
  scrollToHowItWorks(): void {
    document
      .getElementById('how-it-works')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  }
}