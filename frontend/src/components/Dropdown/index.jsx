import React from "react";
import classNames from "classnames";
import PropTypes from "prop-types";

const Dropdown = ({
  options,
  value,
  onChange,
  placeholder,
  className,
  valueKey = "name",
  id,
  label,
}) => {
  // Ensure options is always an array
  const validOptions = Array.isArray(options) ? options : [];

  return (
    <div className="dropdown-container">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={id}
        className={classNames(
          "w-full border rounded-md px-2 py-1.5 mt-1 outline-none",
          className,
          { "text-gray-400": !value },
        )}
        value={value || ""}
        onChange={onChange}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {validOptions.length > 0 ? (
          validOptions.map((option) => (
            <option key={option.id} value={option[valueKey]}>
              {option.name}
            </option>
          ))
        ) : (
          <option value="" disabled>
            No options available
          </option>
        )}
      </select>
    </div>
  );
};

// Prop types validation
Dropdown.propTypes = {
  options: PropTypes.array,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  valueKey: PropTypes.string,
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
};

// Default props
Dropdown.defaultProps = {
  options: [],
  value: "",
  placeholder: "",
  className: "",
  valueKey: "name",
  label: "",
};

export default React.memo(Dropdown);
