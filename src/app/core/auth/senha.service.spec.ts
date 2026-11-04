import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SenhaService } from './senha.service';

describe('SenhaService', () => {
  let service: SenhaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SenhaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pede o link de recuperação com o e-mail sem espaços', () => {
    service.solicitarRecuperacao('  ana@empresa.com ').subscribe();
    const req = http.expectOne('http://localhost:8080/auth/esqueci-senha');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@empresa.com' });
    req.flush(null);
  });

  it('redefine a senha com o token', () => {
    service.redefinir('tok-123', 'NovaSenha@1').subscribe();
    const req = http.expectOne('http://localhost:8080/auth/redefinir-senha');
    expect(req.request.body).toEqual({ token: 'tok-123', novaSenha: 'NovaSenha@1' });
    req.flush(null);
  });
});
