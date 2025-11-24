import React from 'react';

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: SelectOption[];
};

export const Select: React.FC<SelectProps> = ({ label, options, id, ...props }) => {
  return (
    <label className="form-field" htmlFor={id}>
      {label && <span>{label}</span>}
      <select id={id} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};
