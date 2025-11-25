export type AuthUser = {
  id: string;
  name: string;
  role: 'AGENT' | 'SUPERVISOR';
  email: string;
  phone?: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
