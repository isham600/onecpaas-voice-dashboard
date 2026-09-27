import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const Loader = ({ percentage }) => {
  return (
    <div style={loaderStyles.container}>
      <FontAwesomeIcon icon={faSpinner} spin style={loaderStyles.spinner} />
      {percentage !== undefined && (
        <div style={loaderStyles.percentage}>{percentage}%</div>
      )}
    </div>
  );
};

Loader.propTypes = {
  percentage: PropTypes.number, // Made optional as it may not always be used
};

// Inline styles for centering and aesthetics
const loaderStyles = {
  container: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    zIndex: 9999,
  },
  spinner: {
    fontSize: "4rem", // Adjust size as needed
    color: "#ffffff", // Change to your theme's color
  },
  percentage: {
    marginTop: "10px",
    fontSize: "1.2rem",
    color: "#ffffff",
  },
};

export default Loader;
