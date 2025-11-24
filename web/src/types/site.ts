export type Site = {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  timeWindow?: string;
  active: boolean;
  supervisorIds: string[];
  supervisors: { id: string; name: string }[];
};
