import React from 'react';

type ChipProps = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
};

export const Chip: React.FC<ChipProps> = ({ selected, onClick, children, disabled }) => (
  <button
    type="button"
    className={`chip ${selected ? 'chip--selected' : ''}`.trim()}
    aria-pressed={selected}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);
