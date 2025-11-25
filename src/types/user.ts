export type User = {
  id: string;
  name: string;
  email: string;
  role: 'AGENT' | 'SUPERVISOR';
  phone: string;
};
