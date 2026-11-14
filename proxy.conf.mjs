// Repassa as chamadas /api do `ng serve` para o backend, sem precisar de CORS no navegador.
// No Docker, o compose.yaml aponta API_URL para o backend rodando na máquina.
export default {
  '/api': {
    target: process.env.API_URL ?? 'http://localhost:8080',
    secure: false,
  },
};
