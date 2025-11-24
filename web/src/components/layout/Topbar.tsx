import React from 'react';
import { useAuthContext } from '../../context/AuthContext';

type TopbarProps = {
  onMenuToggle?: () => void;
};

export const Topbar: React.FC<TopbarProps> = ({ onMenuToggle }) => {
  const { user } = useAuthContext();

  return (
    <header className="topbar">
      <div className="topbar__headline">
        <button
          type="button"
          className="topbar__menu-button"
          onClick={onMenuToggle}
          aria-label="Ouvrir la navigation"
        >
          <span />
          <span />
          <span />
        </button>
        <p className="topbar__eyebrow">Cockpit propreté</p>
        <h1 className="topbar__title">Suivi temps réel des équipes Madypro Clean</h1>
      </div>
      <div className="topbar__actions">
        <div className="topbar__profile">
          <span>{user?.name}</span>
          <small>{user?.role}</small>
        </div>
      </div>
    </header>
  );
};
