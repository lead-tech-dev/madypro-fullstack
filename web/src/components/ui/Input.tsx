import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
};

export const Input: React.FC<InputProps> = ({ label, helperText, id, ...props }) => {
  return (
    <label className="form-field" htmlFor={id}>
      {label && <span>{label}</span>}
      <input id={id} {...props} />
      {helperText && <small>{helperText}</small>}
    </label>
  );
};
