import { useEffect, useState } from 'react';
import { Attendance } from '../types/attendance';
import { listAttendance } from '../services/api/attendance.api';

export const useAttendance = () => {
  const [entries, setEntries] = useState<Attendance[]>([]);

  useEffect(() => {
    listAttendance().then(setEntries);
  }, []);

  return entries;
};
