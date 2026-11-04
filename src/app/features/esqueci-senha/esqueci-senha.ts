import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { BotaoDirective } from '../../components/ui/botao.component';
import { CampoComponent, InputDirective } from '../../components/ui/campo.component';
import { BrandLogoComponent } from '../../components/ui/mascote-logo.component';
import { SenhaService } from '../../core/auth/senha.service';

@Component({
  selector: 'app-esqueci-senha',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BrandLogoComponent,
    CampoComponent,
    InputDirective,
    BotaoDirective,
  ],
  templateUrl: './esqueci-senha.html',
})
export class EsqueciSenha {
  private readonly senhaService = inject(SenhaService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
  });
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);

  constructor() {
    inject(Title).setTitle('Recuperar senha — EquipTrack');
  }

  protected enviar(): void {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    // Por segurança a mensagem final é a mesma em sucesso ou erro: não revela se o e-mail existe.
    const concluir = () => {
      this.enviando.set(false);
      this.enviado.set(true);
    };
    this.senhaService
      .solicitarRecuperacao(this.form.controls.email.value)
      .subscribe({ next: concluir, error: concluir });
  }

  protected erroEmail(): string | undefined {
    const c = this.form.controls.email;
    if (!c.touched || c.valid) return undefined;
    return c.hasError('required') ? 'E-mail é obrigatório' : 'E-mail em formato inválido';
  }
}
