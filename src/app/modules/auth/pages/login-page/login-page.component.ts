import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';

@Component({
  selector: 'app-login-page',
  standalone: true,
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // RouterOutlet
  ],
})
export class LoginPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  errorSession: boolean = false;
  submitted: boolean = false;

  constructor(
    private authService: AuthService,
    // private cookie: CookieService,
    private router: Router
  ) {}
  formLogin = new FormGroup({
    name: new FormControl('', Validators.required),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(12),
    ]),
  });
  ngOnInit(): void {}

  sendLogin(): void {
    // this.router.navigate(['dashboard', '']);

    const { name, password } = this.formLogin.value;

    if (this.formLogin.invalid) {
      this.submitted = true;
      return;
    }

    this.authService
      .sendCredentials(name!, password!)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((response) => {
          // The response contains the JSON object with a message and user data
          const { message, user } = response;

          // Assuming you could still want to handle token or session (if needed)
          this.router.navigate(['/dashboard', 'events']);
        }),
        tap({
          next: (response) => {
            console.log('Ha sido un éxito', response);
          },
          error: (err) => {
            // Handle error response (e.g., 401 Unauthorized)
            this.errorSession = true;
            console.log(
              'Ocurrió error con tu nombre de usuario o contraseña',
              err
            );
          },
        })
      )
      .subscribe();
  }
}
