import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AbaNavegacao,
  Equipamento,
  EstadoTela,
  PerfilUsuario,
  Solicitacao,
} from '../../models/equiptrack.models';
import { EquipTrackService } from '../../services/equiptrack.service';
import { BotaoDirective } from '../ui/botao.component';
import { SelectDirective } from '../ui/campo.component';
import { EstadoVazioComponent } from '../ui/estados-visuais.component';
import { IconComponent } from '../ui/icon.component';
import { BrandLogoComponent } from '../ui/mascote-logo.component';
import { SeloComponent } from '../ui/selo.component';

@Component({
  selector: 'app-busca-rapida',
  standalone: true,
  imports: [FormsModule, IconComponent, SeloComponent, EstadoVazioComponent],
  template: `
    <div class="relative">
      <app-icon
        name="search"
        svgClass="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        #inputBusca
        type="text"
        aria-label="Busca rápida"
        placeholder="Buscar patrimônio, equipamento ou solicitante"
        class="h-10 w-full rounded-md border border-border bg-background pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:border-accent-text focus:outline-none"
        [ngModel]="termo()"
        (ngModelChange)="termo.set($event)"
      />
      <kbd
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm border border-border px-1.5 font-mono text-[11px] text-muted-foreground"
      >
        /
      </kbd>

      @if (termoLimpo()) {
        <div
          class="absolute inset-x-0 top-12 z-40 max-h-96 overflow-y-auto rounded-md border border-border bg-surface shadow-2xl"
        >
          @if (equipamentosEncontrados().length + solicitacoesEncontradas().length === 0) {
            <app-estado-vazio
              titulo="Nada por aqui"
              [texto]="'Nenhum resultado para “' + termo() + '”.'"
            />
          } @else {
            @if (equipamentosEncontrados().length > 0) {
              <p class="px-3 pt-3 text-[11px] font-semibold tracking-widest text-muted-foreground">
                EQUIPAMENTOS
              </p>
            }
            @for (e of equipamentosEncontrados(); track e.patrimonio) {
              <button
                type="button"
                (click)="selecionarPatrimonio(e.patrimonio)"
                class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-2"
              >
                <span>
                  <span class="font-mono text-accent-text">{{ e.patrimonio }}</span>
                  {{ ' ' }}
                  <span class="text-sm">{{ e.descricao }}</span>
                </span>
                <app-selo [valor]="e.situacao" />
              </button>
            }
            @if (solicitacoesEncontradas().length > 0) {
              <p class="px-3 pt-3 text-[11px] font-semibold tracking-widest text-muted-foreground">
                SOLICITAÇÕES
              </p>
            }
            @for (s of solicitacoesEncontradas(); track s.id) {
              <button
                type="button"
                (click)="selecionarPatrimonio(s.patrimonio)"
                class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-surface-2"
              >
                <span class="text-sm">
                  {{ s.solicitante }} · <span class="font-mono">{{ s.patrimonio }}</span>
                </span>
                <app-selo [valor]="s.status" />
              </button>
            }
            <div class="h-2"></div>
          }
        </div>
      }
    </div>
  `,
})
export class BuscaRapidaComponent implements AfterViewInit {
  readonly equips = input.required<Equipamento[]>();
  readonly sols = input.required<Solicitacao[]>();
  readonly autoFocus = input<boolean>(false);
  readonly abrirHist = output<string>();

  readonly termo = signal<string>('');
  readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputBusca');

  ngAfterViewInit(): void {
    if (this.autoFocus()) {
      this.inputRef()?.nativeElement.focus();
    }
  }

  readonly termoLimpo = computed(() => this.termo().trim().toLowerCase());

  readonly equipamentosEncontrados = computed(() => {
    const q = this.termoLimpo();
    if (!q) return [];
    return this.equips().filter((e) =>
      `${e.patrimonio} ${e.descricao}`.toLowerCase().includes(q),
    );
  });

  readonly solicitacoesEncontradas = computed(() => {
    const q = this.termoLimpo();
    if (!q) return [];
    return this.sols().filter((s) =>
      `${s.patrimonio} ${s.solicitante}`.toLowerCase().includes(q),
    );
  });

  @HostListener('window:keydown', ['$event'])
  aoPressionarTecla(event: KeyboardEvent): void {
    const ativo = typeof document !== 'undefined' ? document.activeElement?.tagName : '';
    if (event.key === '/' && ativo !== 'INPUT' && ativo !== 'TEXTAREA') {
      event.preventDefault();
      this.inputRef()?.nativeElement.focus();
    }
  }

  selecionarPatrimonio(patrimonio: string): void {
    this.abrirHist.emit(patrimonio);
    this.termo.set('');
  }
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    FormsModule,
    BrandLogoComponent,
    IconComponent,
    BotaoDirective,
    SelectDirective,
    BuscaRapidaComponent,
  ],
  template: `
    <header class="sticky top-0 z-30 shrink-0 border-b border-border bg-topbar">
      <div class="flex h-16 items-center gap-6 px-4 lg:px-6">
        <app-brand-logo [compact]="true" />

        <nav class="hidden h-full items-center gap-6 lg:flex" aria-label="Principal">
          @for (link of state.linksNavegacao(); track link) {
            <button
              type="button"
              (click)="irPara(link)"
              [class]="
                'relative h-full text-[13px] font-semibold tracking-[0.14em] transition-colors ' +
                (state.abaAtiva() === link
                  ? 'text-accent-text'
                  : 'text-muted-foreground hover:text-foreground')
              "
            >
              {{ link }}
              @if (state.abaAtiva() === link) {
                <span class="absolute inset-x-0 bottom-0 h-0.5 bg-accent-text"></span>
              }
            </button>
          }
        </nav>

        <div class="ml-auto hidden w-full max-w-sm md:block">
          <app-busca-rapida
            [equips]="state.equipamentos()"
            [sols]="state.solicitacoes()"
            (abrirHist)="state.abrirHistorico($event)"
          />
        </div>

        <div class="ml-auto flex items-center gap-2 md:ml-0">
          <select
            appSelect
            aria-label="Estado da tela (protótipo)"
            extraClass="hidden !min-h-8 w-auto py-0 text-xs xl:block"
            [ngModel]="state.estado()"
            (ngModelChange)="aoMudarEstado($event)"
          >
            <option value="normal">Estado: normal</option>
            <option value="carregando">Estado: carregando</option>
            <option value="vazio">Estado: vazio</option>
            <option value="erro">Estado: erro</option>
          </select>

          <select
            appSelect
            aria-label="Perfil (protótipo)"
            extraClass="hidden !min-h-8 w-auto py-0 text-xs sm:block"
            [ngModel]="state.perfil()"
            (ngModelChange)="aoMudarPerfil($event)"
          >
            <option value="operador">Operador</option>
            <option value="rafael">Solicitante · Rafael</option>
            <option value="beatriz">Solicitante · Beatriz</option>
          </select>

          <div class="relative hidden sm:block">
            <button
              type="button"
              (click)="menuUsuarioAberto.set(!menuUsuarioAberto())"
              class="flex items-center gap-1"
              aria-label="Menu do usuário"
              [attr.aria-expanded]="menuUsuarioAberto()"
            >
              <span
                class="grid size-9 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent"
              >
                {{ state.iniciaisUsuarioAtual() }}
              </span>
              <app-icon name="chevron-down" svgClass="size-4 text-muted-foreground" />
            </button>

            @if (menuUsuarioAberto()) {
              <div
                class="absolute right-0 top-12 w-56 rounded-md border border-border bg-surface p-2 shadow-xl"
              >
                <p class="px-2 pt-1 font-semibold">{{ state.nomeUsuarioAtual() }}</p>
                <p class="px-2 pb-2 text-xs text-muted-foreground">
                  {{ state.ehOperador() ? 'Operador' : 'Solicitante' }}
                </p>
                <button
                  type="button"
                  (click)="sair.emit()"
                  class="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-surface-2"
                >
                  <app-icon name="log-out" svgClass="size-4" />
                  Sair
                </button>
              </div>
            }
          </div>

          <button
            type="button"
            class="grid size-11 place-items-center md:hidden"
            aria-label="Buscar"
            (click)="buscaMobileAberta.set(!buscaMobileAberta())"
          >
            <app-icon name="search" svgClass="size-5" />
          </button>

          <button
            type="button"
            class="grid size-11 place-items-center lg:hidden"
            aria-label="Abrir menu"
            (click)="menuMobileAberto.set(true)"
          >
            <app-icon name="menu" svgClass="size-6" />
          </button>
        </div>
      </div>

      <div class="h-0.5 bg-accent"></div>

      @if (buscaMobileAberta()) {
        <div class="border-b border-border p-3 md:hidden">
          <app-busca-rapida
            [equips]="state.equipamentos()"
            [sols]="state.solicitacoes()"
            [autoFocus]="true"
            (abrirHist)="state.abrirHistorico($event)"
          />
        </div>
      }

      @if (menuMobileAberto()) {
        <div class="fixed inset-0 z-50 flex flex-col bg-topbar p-5 stripes">
          <div class="flex items-center justify-between">
            <app-brand-logo [compact]="true" />
            <button
              type="button"
              class="grid size-11 place-items-center"
              aria-label="Fechar menu"
              (click)="menuMobileAberto.set(false)"
            >
              <app-icon name="x" svgClass="size-6" />
            </button>
          </div>

          <nav class="mt-10 flex flex-col gap-2">
            @for (link of state.linksNavegacao(); track link) {
              <button
                type="button"
                (click)="irParaMobile(link)"
                [class]="
                  'text-left font-display text-5xl ' +
                  (state.abaAtiva() === link ? 'text-accent-text' : 'text-foreground')
                "
              >
                {{ link }}
              </button>
            }
          </nav>

          <div class="mt-auto space-y-3">
            <select
              appSelect
              aria-label="Perfil (protótipo)"
              [ngModel]="state.perfil()"
              (ngModelChange)="aoMudarPerfil($event)"
            >
              <option value="operador">Operador</option>
              <option value="rafael">Solicitante · Rafael</option>
              <option value="beatriz">Solicitante · Beatriz</option>
            </select>

            <select
              appSelect
              aria-label="Estado da tela (protótipo)"
              [ngModel]="state.estado()"
              (ngModelChange)="aoMudarEstado($event)"
            >
              <option value="normal">Estado: normal</option>
              <option value="carregando">Estado: carregando</option>
              <option value="vazio">Estado: vazio</option>
              <option value="erro">Estado: erro</option>
            </select>

            <button
              type="button"
              appBotao
              variant="secundario"
              extraClass="w-full"
              (click)="sair.emit()"
            >
              <app-icon name="log-out" svgClass="size-4" />
              Sair
            </button>
          </div>
        </div>
      }
    </header>
  `,
})
export class TopbarComponent {
  readonly state = inject(EquipTrackService);
  readonly sair = output<void>();

  readonly menuMobileAberto = signal(false);
  readonly buscaMobileAberta = signal(false);
  readonly menuUsuarioAberto = signal(false);

  irPara(aba: AbaNavegacao): void {
    this.state.irParaAba(aba);
  }

  irParaMobile(aba: AbaNavegacao): void {
    this.state.irParaAba(aba);
    this.menuMobileAberto.set(false);
  }

  aoMudarPerfil(novoPerfil: PerfilUsuario): void {
    this.state.definirPerfil(novoPerfil);
    this.menuUsuarioAberto.set(false);
  }

  aoMudarEstado(novoEstado: EstadoTela): void {
    this.state.definirEstado(novoEstado);
  }
}
