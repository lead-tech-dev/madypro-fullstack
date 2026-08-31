export class UserEntity {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  role!: string;
  phone!: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  password!: string;
  active!: boolean;
  twoFactorSecret?: string;
  twoFactorEnabled!: boolean;
  permissions!: string[];
}
