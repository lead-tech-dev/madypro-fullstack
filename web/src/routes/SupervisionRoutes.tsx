import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { SupervisorDashboardPage } from '../pages/supervision/SupervisorDashboardPage';
import { SupervisorSitesPage } from '../pages/supervision/SupervisorSitesPage';
import { SupervisorPresencePage } from '../pages/supervision/SupervisorPresencePage';
import { SupervisorPlanningPage } from '../pages/supervision/SupervisorPlanningPage';
import { SupervisorInterventionsPage } from '../pages/supervision/SupervisorInterventionsPage';
import { SupervisorAbsencesPage } from '../pages/supervision/SupervisorAbsencesPage';

export const SupervisionRoutes = () => (
  <Route element={<ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']} />}>
    <Route element={<AppLayout />}>
      <Route path="/supervision" element={<Navigate to="/supervision/dashboard" replace />} />
      <Route path="/supervision/dashboard" element={<SupervisorDashboardPage />} />
      <Route path="/supervision/sites" element={<SupervisorSitesPage />} />
      <Route path="/supervision/presence" element={<SupervisorPresencePage />} />
      <Route path="/supervision/planning" element={<SupervisorPlanningPage />} />
      <Route path="/supervision/interventions" element={<SupervisorInterventionsPage />} />
      <Route path="/supervision/absences" element={<SupervisorAbsencesPage />} />
    </Route>
  </Route>
);
