import { Component } from '@angular/core';
import { LandingNav } from './components/landing-nav/landing-nav';
import { LandingHero } from './components/landing-hero/landing-hero';

@Component({
  selector: 'app-landing',
  imports: [
    LandingNav,
    LandingHero,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {}