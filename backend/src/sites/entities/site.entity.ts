export class SiteEntity {
  id!: string;
  name!: string;
  address!: string;
  latitude?: number;
  longitude?: number;
  timeWindow?: string;
  active!: boolean;
  supervisorIds: string[] = [];
  accessInstructions?: string;
  accessCode?: string;
  contactName?: string;
  contactPhone?: string;
  photos: string[] = [];
}
