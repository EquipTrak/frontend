import { InjectionToken } from '@angular/core';

/** URL base do backend (Spring Boot). Em produção, sobrescrever via provider. */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:8080',
});
