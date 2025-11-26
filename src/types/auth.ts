export type AuthUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};
