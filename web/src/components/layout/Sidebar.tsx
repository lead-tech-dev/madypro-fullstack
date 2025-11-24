import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';

const MENU_ITEMS: Array<
  | { type: 'link'; to: string; label: string }
  | { type: 'group'; label: string; children: { to: string; label: string }[] }
> = [
  { type: 'link', to: '/dashboard', label: 'Tableau de bord' },
  {
    type: 'group',
    label: 'Sites & clients',
    children: [
      { to: '/sites', label: 'Sites' },
      { to: '/clients', label: 'Clients' },
    ],
  },
  { type: 'link', to: '/users', label: 'Équipes' },
  { type: 'link', to: '/interventions', label: 'Interventions' },
  { type: 'link', to: '/attendance', label: 'Pointages' },
  { type: 'link', to: '/absences', label: 'Absences' },
  { type: 'link', to: '/notifications', label: 'Notifications' },
  { type: 'link', to: '/reports', label: 'Rapports' },
  { type: 'link', to: '/settings', label: 'Paramètres' },
  { type: 'link', to: '/audit', label: 'Audit' },
];

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuthContext();
  const navigate = useNavigate();
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <span className="sidebar__logo">MC</span>
        <div>
          <p className="sidebar__title">Madypro Clean</p>
          <p className="sidebar__subtitle">Admin</p>
        </div>
      </div>
      <nav
        className="sidebar__nav"
        onClick={(e) => {
          onClose();
          setPortfolioOpen(false);
        }}
      >
        {MENU_ITEMS.map((item) => {
          if (item.type === 'link') {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            );
          }
          // group
          return (
            <div key={item.label}>
              <div
                role="button"
                tabIndex={0}
                className={`sidebar__link${portfolioOpen ? ' sidebar__link--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPortfolioOpen((prev) => !prev);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPortfolioOpen((prev) => !prev);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {item.label}
              </div>
              {portfolioOpen && (
                <div className="sidebar__sublinks">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `sidebar__link sidebar__link--sub${isActive ? ' sidebar__link--active' : ''}`
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="sidebar__footer">
        <button type="button" className="btn btn--primary" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </aside>
  );
};
