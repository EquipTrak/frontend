import { LoginResponse } from './auth.models';

export const RESPOSTA_LOGIN: LoginResponse = {
  token: 'token-abc',
  tipo: 'Bearer',
  expiraEmSegundos: 28800,
  usuario: {
    id: 1,
    nome: 'Administrador',
    email: 'admin@equiptrack.local',
    perfil: 'ADMINISTRADOR',
  },
};
