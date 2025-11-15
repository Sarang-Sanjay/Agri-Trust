import React from 'react';
import { InputProps } from '../types';

const Input: React.FC<InputProps> = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  containerClassName = '',
  className = '',
  ...props
}) => {
  const inputBaseStyles = `block w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2
    ${error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400 dark:focus:ring-red-300'
      : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-300'
    }`;

  return (
    <div className={`mb-4 ${containerClassName}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputBaseStyles} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {/* {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      )} */}
    </div>
  );
};

export default Input;