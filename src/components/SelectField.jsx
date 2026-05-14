import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

const customStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: '#EAEAEA',
    border: 'none',
    borderRadius: '0.75rem',
    padding: '0.125rem 0.25rem',
    boxShadow: state.isFocused ? '0 0 0 2px #A7C7E7' : 'none',
    minHeight: '42px',
    cursor: 'pointer',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
    fontSize: '0.875rem',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#4A5568',
    fontSize: '0.875rem',
  }),
  input: (base) => ({
    ...base,
    color: '#4A5568',
    fontSize: '0.875rem',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuList: (base) => ({
    ...base,
    padding: '0.25rem',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#A7C7E7' : state.isFocused ? '#A7C7E730' : 'white',
    color: state.isSelected ? 'white' : '#4A5568',
    fontSize: '0.875rem',
    cursor: 'pointer',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({
    ...base,
    color: '#94a3b8',
    padding: '0.5rem',
    '&:hover': { color: '#74739E' },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: '#94a3b8',
    padding: '0.5rem',
    '&:hover': { color: '#ef4444' },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#A7C7E720',
    borderRadius: '0.5rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#4A5568',
    fontSize: '0.875rem',
  }),
  multiValueRemove: (base) => ({
    ...base,
    borderRadius: '0.25rem',
    '&:hover': { backgroundColor: '#ef444420', color: '#ef4444' },
  }),
};

const SelectField = ({
  label,
  options = [],
  value,
  onChange,
  onCreateOption,
  placeholder = 'Seleccionar...',
  isClearable = true,
  isCreatable = false,
  isMulti = false,
  required = false,
}) => {
  const selectedOption = isMulti
    ? (value || []).map(v => options.find(o => o.value === v) || { value: v, label: v })
    : options.find(o => o.value === value) || (value ? { value, label: value } : null);

  const handleChange = (selected) => {
    if (!selected) {
      onChange(isMulti ? [] : null);
      return;
    }
    if (isMulti) {
      onChange(selected.map(o => o.value));
    } else {
      onChange(selected.value);
    }
  };

  const Component = isCreatable ? CreatableSelect : Select;

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
          {label}{required && ' *'}
        </label>
      )}
      <Component
        styles={customStyles}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        onCreateOption={onCreateOption}
        placeholder={placeholder}
        isClearable={isClearable}
        isMulti={isMulti}
        noOptionsMessage={() => 'Sin opciones'}
        formatCreateLabel={(input) => `Crear "${input}"`}
      />
    </div>
  );
};

export default SelectField;
