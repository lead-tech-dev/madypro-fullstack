export type AttendanceStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

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
  interventionId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  plannedStart?: string;
  plannedEnd?: string;
  durationMinutes?: number;
  status: AttendanceStatus;
  manual: boolean;
  note?: string;
};
