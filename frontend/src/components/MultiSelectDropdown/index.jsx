import Select from "react-select";

const colorStyles = {
  multiValue: (styles, { data }) => {
    return {
      ...styles,
      backgroundColor: data.color || "#337bff",
      padding: "0 4px",
      borderRadius: "16px",
    };
  },

  multiValueLabel: (styles) => ({
    ...styles,
    color: "white",
    fontWeight: "bold",
    fontSize: "12px",
  }),

  multiValueRemove: (styles) => ({
    ...styles,
    color: "white",
    ":hover": {
      backgroundColor: "transparent",
      color: "white",
    },
  }),

  control: (styles) => ({
    ...styles,
    boxShadow: "none",
    minHeight: "32px", // Matches Material UI TextField height
    "&:hover": {
      borderColor: "#111000",
    },
  }),
};

const MultiSelectDropdown = ({
  options = [],
  value = [],
  onChange,
  placeholder,
  labelKey,
  valueKey = "id",
}) => {
  const selectOptions = options.map((option) => ({
    value: option[valueKey],
    label: option[labelKey],
    color: option.color,
  }));

  const selectedOptions = selectOptions.filter((option) =>
    value.includes(option.value),
  );

  const handleChange = (selected) => {
    const selectedValues = selected ? selected.map((opt) => opt.value) : [];
    onChange(selectedValues);
  };

  return (
    <Select
      options={selectOptions}
      value={selectedOptions}
      onChange={handleChange}
      placeholder={placeholder}
      isMulti
      styles={colorStyles}
      className="w-full"
    />
  );
};

export default MultiSelectDropdown;
