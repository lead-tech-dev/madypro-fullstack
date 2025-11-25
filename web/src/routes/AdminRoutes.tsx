import React from 'react';
import { Route } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { UsersListPage } from '../pages/users/UsersListPage';
import { UserFormPage } from '../pages/users/UserFormPage';
import { SitesListPage } from '../pages/sites/SitesListPage';
import { SiteFormPage } from '../pages/sites/SiteFormPage';
import { InterventionsPage } from '../pages/interventions/InterventionsPage';
import { AttendanceListPage } from '../pages/attendance/AttendanceListPage';
import { AbsencesListPage } from '../pages/absences/AbsencesListPage';
import { AbsenceDetailPage } from '../pages/absences/AbsenceDetailPage';
import { ReportsPage } from '../pages/reports/ReportsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { AuditPage } from '../pages/audit/AuditPage';
import { ClientsPage } from '../pages/clients/ClientsPage';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const AdminRoutes = () => (
  <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
    <Route element={<AppLayout />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/users" element={<UsersListPage />} />
      <Route path="/users/new" element={<UserFormPage />} />
      <Route path="/users/:id/edit" element={<UserFormPage />} />
      <Route path="/sites" element={<SitesListPage />} />
      <Route path="/sites/new" element={<SiteFormPage />} />
      <Route path="/sites/:id/edit" element={<SiteFormPage />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/interventions" element={<InterventionsPage />} />
      <Route path="/attendance" element={<AttendanceListPage />} />
      <Route path="/absences" element={<AbsencesListPage />} />
      <Route path="/absences/:id" element={<AbsenceDetailPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/audit" element={<AuditPage />} />
    </Route>
  </Route>
);
