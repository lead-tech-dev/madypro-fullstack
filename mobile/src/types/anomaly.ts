export type AnomalyStatus = 'NEW' | 'RESOLVED';

export type AnomalyType =
  | 'CLEANLINESS'
  | 'MISSING_SUPPLIES'
  | 'ACCESS'
  | 'DAMAGE'
  | 'OTHER'
  | string;

export type Anomaly = {
  id: string;
  interventionId: string;
  user: { id: string; name: string };
  type: string;
  title?: string;
  description: string;
  photos: string[];
  status: AnomalyStatus;
  createdAt: string;
};
