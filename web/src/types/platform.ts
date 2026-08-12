export type ApiKey = {
  id: string;
  label: string;
  key: string;
  scopes: string[];
  active: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

export type PortalToken = {
  id: string;
  siteId: string;
  site?: { name: string };
  token: string;
  active: boolean;
  createdAt: string;
};
