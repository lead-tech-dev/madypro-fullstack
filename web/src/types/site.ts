export type Site = {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  timeWindow?: string;
  active: boolean;
  supervisorIds: string[];
  supervisors: { id: string; name: string }[];
};
