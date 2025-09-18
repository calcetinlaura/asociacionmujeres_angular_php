import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { AuthService } from 'src/app/modules/auth/services/auth.service';

@Component({
  selector: 'app-login-page',
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
