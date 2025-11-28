export type AttendanceStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export class AttendanceEntity {
  id!: string;
  userId!: string;
  siteId!: string;
  clientId!: string;
  interventionId?: string;
  arrivalTime?: Date;
  arrivalLocation?: { latitude: number; longitude: number };
  plannedStart?: Date;
  plannedEnd?: Date;
  checkIn?: Date;
  checkOut?: Date;
  checkInLocation?: { latitude: number; longitude: number };
  checkOutLocation?: { latitude: number; longitude: number };
  status: AttendanceStatus = 'PENDING';
  note?: string;
  manual!: boolean;
  createdBy!: 'AGENT' | 'SUPERVISOR' | 'ADMIN';
  createdAt!: Date;
  updatedAt!: Date;
  lastSeenAt?: Date;
  lastSeenLocation?: { latitude: number; longitude: number };
  outsideSince?: Date;
}
