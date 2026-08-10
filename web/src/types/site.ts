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
  accessInstructions?: string;
  accessCode?: string;
  contactName?: string;
  contactPhone?: string;
  photos?: string[];
};

export type SiteChecklistItem = {
  id: string;
  siteId: string;
  label: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};
