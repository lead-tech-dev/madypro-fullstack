export type AttendanceStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export type AttendanceLocation = {
  latitude: number;
  longitude: number;
  distanceMeters?: number;
};

export type Attendance = {
  id: string;
  date: string;
  agent: {
    id: string;
    name: string;
  };
  site: {
    id: string;
    name: string;
    clientName: string;
  };
  clientId: string;
  interventionId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  plannedStart?: string;
  plannedEnd?: string;
  durationMinutes?: number;
  status: AttendanceStatus;
  manual: boolean;
  createdBy: string;
  note?: string;
  gps: {
    checkIn?: AttendanceLocation;
    checkOut?: AttendanceLocation;
  };
};
