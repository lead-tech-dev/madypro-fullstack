export class SiteEntity {
  id!: string;
  name!: string;
  clientId!: string;
  address!: string;
  latitude?: number;
  longitude?: number;
  timeWindow?: string;
  active!: boolean;
  supervisorIds: string[] = [];
}
