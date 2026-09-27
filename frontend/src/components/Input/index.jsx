import classNames from "classnames";

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  noBorder = false,
  autoFocus = false,
  className = "",
  errorMessage,
  ...props
}) => {
  return (
    <div className={classNames("flex flex-col font-medium", className)}>
      {label && <label>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        className={classNames(
          "rounded-md px-2 py-1.5 mt-1 outline-none font-normal",
          {
            "cursor-not-allowed": disabled,
            "border-none": noBorder,
            border: !noBorder,
          },
        )}
        {...props}
      />
      {errorMessage && (
        <span className="text-red-500 text-sm mt-1">{errorMessage}</span>
      )}
    </div>
  );
};

export default Input;
