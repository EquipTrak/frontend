import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BotaoDirective } from '../../components/ui/botao.component';
import { CampoComponent, InputDirective } from '../../components/ui/campo.component';
import { BrandLogoComponent } from '../../components/ui/mascote-logo.component';
import { SenhaService } from '../../core/auth/senha.service';
import { mensagemDeErro } from '../../core/http/mensagem-erro';

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const nova = grupo.get('novaSenha')?.value;
  const confirmacao = grupo.get('confirmacao')?.value;
  return nova && confirmacao && nova !== confirmacao ? { diferentes: true } : null;
}

@Component({
  selector: 'app-redefinir-senha',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    BrandLogoComponent,
    CampoComponent,
    InputDirective,
    BotaoDirective,
  ],
  templateUrl: './redefinir-senha.html',
})
export class RedefinirSenha {
  private readonly senhaService = inject(SenhaService);
  private readonly router = inject(Router);

  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      novaSenha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmacao: ['', [Validators.required]],
    },
    { validators: senhasIguais },
  );
  protected readonly salvando = signal(false);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Redefinir senha — EquipTrak');
  }

  protected salvar(): void {
    if (this.salvando() || !this.token) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    this.senhaService.redefinir(this.token, this.form.controls.novaSenha.value).subscribe({
      next: () => void this.router.navigate(['/login'], { queryParams: { senhaRedefinida: true } }),
      error: (e: unknown) => {
        this.erro.set(mensagemDeErro(e));
        this.salvando.set(false);
      },
    });
  }

  protected erroNova(): string | undefined {
    const c = this.form.controls.novaSenha;
    if (!c.touched || c.valid) return undefined;
    if (c.hasError('required')) return 'Nova senha é obrigatória';
    return c.hasError('minlength') ? 'Use pelo menos 8 caracteres' : 'Use no máximo 72 caracteres';
  }

  protected erroConfirmacao(): string | undefined {
    const c = this.form.controls.confirmacao;
    if (!c.touched) return undefined;
    if (c.hasError('required')) return 'Confirme a nova senha';
    return this.form.hasError('diferentes') ? 'As senhas não conferem' : undefined;
  }
}
