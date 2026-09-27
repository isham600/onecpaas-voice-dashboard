import PropTypes from "prop-types";
import classNames from "classnames";

// Define possible variants and sizes as constants
const VARIANTS = {
  DEFAULT: "default",
  PRIMARY: "primary",
  SECONDARY: "secondary",
  SUCCESS: "success",
  FAILURE: "failure",
};

const SIZES = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
};

const Button = ({
  children,
  onClick = () => {}, // Default function that does nothing
  className = "",
  variant = VARIANTS.DEFAULT,
  size = SIZES.MEDIUM,
  disabled = false,
  loading,
  ...props
}) => {
  // Base styles common to all buttons
  const baseStyles =
    "border rounded px-6 py-2 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2";

  // Styles for different button variants
  const variantStyles = {
    [VARIANTS.DEFAULT]:
      "border-gray-500 text-gray-500 hover:bg-gray-100 focus:ring-gray-300",
    [VARIANTS.PRIMARY]:
      "border-blue-500 bg-blue-500 text-white hover:bg-blue-600 focus:ring-white",
    [VARIANTS.SECONDARY]:
      "border-red-500 bg-red-500 text-white hover:bg-red-400 focus:ring-red-300",
    [VARIANTS.SUCCESS]:
      "bg-green-500 border-green-500 text-white hover:bg-green-600 focus:ring-green-300",
    [VARIANTS.FAILURE]:
      "text-red-500 border-red-500 hover:bg-red-100 focus:ring-red-300",
  };

  // Styles for different button sizes
  const sizeStyles = {
    [SIZES.SMALL]: "text-sm py-1 px-3",
    [SIZES.MEDIUM]: "text-base py-2 px-6",
    [SIZES.LARGE]: "text-lg py-3 px-8",
  };

  const isDisabled = disabled || loading;
  const disabledStyles = isDisabled ? "cursor-not-allowed opacity-50" : "";

  return (
    <button
      className={classNames(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        disabledStyles,
        className,
      )}
      onClick={!isDisabled ? onClick : null}
      disabled={isDisabled}
      {...props}
      aria-disabled={isDisabled}
    >
      {children}
    </button>
  );
};

// PropTypes definitions with default values and strict types
Button.propTypes = {
  children: PropTypes.node.isRequired, // Button content must be provided
  onClick: PropTypes.func, // Function to handle click events
  className: PropTypes.string, // Custom class names for additional styling
  variant: PropTypes.oneOf(Object.values(VARIANTS)), // Button style variant
  size: PropTypes.oneOf(Object.values(SIZES)), // Button size
  disabled: PropTypes.bool, // Disable button and prevent clicks
};

export default Button;
