import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environments } from 'src/environments/environments';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl: string = `${environments.api}/backend/login.php`;
  constructor(private http: HttpClient) {}

  sendCredentials(name: string, password: string): Observable<any> {
    const body = { name, password };
    return this.http.post(this.apiUrl, body, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
