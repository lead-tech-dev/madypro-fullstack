import { useEffect, useState } from 'react';
import { Attendance } from '../types/attendance';
import { listAttendance } from '../services/api/attendance.api';
import { useAuthContext } from '../context/AuthContext';

export const useAttendance = () => {
  const [entries, setEntries] = useState<Attendance[]>([]);
  const { token } = useAuthContext();

  useEffect(() => {
    if (!token) {
      setEntries([]);
      return;
    }
    listAttendance(token)
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [token]);

  return entries;
};
