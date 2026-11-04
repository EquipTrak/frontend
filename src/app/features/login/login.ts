import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BotaoDirective } from '../../components/ui/botao.component';
import { CampoComponent, InputDirective } from '../../components/ui/campo.component';
import { BrandLogoComponent, MascoteComponent } from '../../components/ui/mascote-logo.component';
import { AuthService } from '../../core/auth/auth.service';
import { mensagemDeErro } from '../../core/http/mensagem-erro';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BrandLogoComponent,
    MascoteComponent,
    CampoComponent,
    InputDirective,
    BotaoDirective,
  ],
  templateUrl: './login.html',
})
export class Login {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    senha: ['', [Validators.required, Validators.maxLength(72)]],
  });
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly sessaoExpirada = this.route.snapshot.queryParamMap.has('sessaoExpirada');
  protected readonly senhaRedefinida = this.route.snapshot.queryParamMap.has('senhaRedefinida');

  constructor() {
    inject(Title).setTitle('Entrar — EquipTrack');
  }

  protected entrar(): void {
    if (this.carregando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.carregando.set(true);
    this.erro.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl(this.destino()),
      error: (e: unknown) => {
        this.erro.set(mensagemDeErro(e));
        this.carregando.set(false);
      },
    });
  }

  protected invalido(campo: 'email' | 'senha'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && c.touched;
  }

  /** Só aceita destinos internos para evitar redirecionamento aberto. */
  private destino(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
