import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';


export interface CalendarConnectionStatus {
  google: {
    connected: boolean;
    syncEnabled: boolean;
    accountEmail: string | null;
    lastSyncedAt: string | null;
    status: string;
  };

  apple: {
    connected: boolean;
    syncEnabled: boolean;
    lastSyncedAt: string | null;
    status: string;
  };
}


export interface GoogleCalendarSyncResult {
  message: string;
  created: number;
  updated: number;
  unchanged: number;
  deleted: number;
  total: number;
}


interface GoogleConnectResponse {
  authorizationUrl: string;
}


export interface GoogleDisconnectResponse {
  message: string;
}


export interface CalendarTimezoneResponse {
  timezone: string;
  changed: boolean;
}


@Injectable({
  providedIn: 'root',
})
export class CalendarIntegrationService {

  private readonly http =
    inject(HttpClient);

  private readonly api =
    environment.apiBase;


  getConnections():
    Observable<CalendarConnectionStatus> {

    return this.http.get<CalendarConnectionStatus>(
      `${this.api}/api/calendar-integrations`,
    );
  }


  connectGoogle():
    Observable<GoogleConnectResponse> {

    return this.http.get<GoogleConnectResponse>(
      `${this.api}/api/calendar-integrations/google/connect`,
    );
  }


  syncGoogle():
    Observable<GoogleCalendarSyncResult> {

    return this.http.post<GoogleCalendarSyncResult>(
      `${this.api}/api/calendar-integrations/google/sync`,
      {},
    );
  }


  disconnectGoogle():
    Observable<GoogleDisconnectResponse> {

    return this.http.delete<GoogleDisconnectResponse>(
      `${this.api}/api/calendar-integrations/google`,
    );
  }


  saveTimezone(
    timezone: string,
  ): Observable<CalendarTimezoneResponse> {

    return this.http.put<CalendarTimezoneResponse>(
      `${this.api}/api/calendar-integrations/timezone`,
      {
        timezone,
      },
    );
  }
}