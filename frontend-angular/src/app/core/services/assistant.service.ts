import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiBase;

  /** Send the recent conversation; the backend adds the student's data as context. */
  ask(messages: ChatMessage[]): Observable<{ reply: string }> {
    return this.http.post<{ reply: string }>(`${this.api}/user/assistant`, { messages });
  }
}