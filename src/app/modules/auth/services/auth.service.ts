import { environments } from '../../../../environments/environments';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl: string = `${environments.api}/api/users`;
  constructor(private http: HttpClient) {}

  sendCredentials(user_name: string, user_password: string): Observable<any> {
    const body = {
      user_name,
      user_password,
    };
    return this.http.post(`${this.apiUrl}/login`, body);
    // .pipe(catchError(this.handleError));
  }
  // private handleError(error: HttpErrorResponse) {
  //   let errorMessage = '';

  //   if (error.error instanceof ErrorEvent) {
  //     // Error del lado del cliente o red
  //     errorMessage = `Error del cliente o red: ${error.error.message}`;
  //   } else {
  //     // El backend retornó un código de error no exitoso
  //     errorMessage = `Código de error del servidor: ${error.status}\nMensaje: ${error.message}`;
  //   }

  //   console.error(errorMessage); // Para depuración

  //   // Aquí podrías devolver un mensaje amigable para el usuario, o simplemente retornar el error
  //   return throwError(
  //     () =>
  //       new Error(
  //         'Hubo un problema con la solicitud, inténtelo de nuevo más tarde.'
  //       )
  //   );
  // }
}
