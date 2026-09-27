import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const CreditCard = ({ title, value, icon }) => (
  <div className="credit-card bg-white p-6 rounded-lg shadow-neumorphism flex flex-col items-center text-center">
    <div className="icon-wrapper mb-4 p-4 rounded-full shadow-neumorphism-inset">
      <FontAwesomeIcon icon={icon} className="text-4xl text-blue-600" />
    </div>
    <h4 className="text-lg font-semibold text-gray-700">{title} </h4>
    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

export default CreditCard;
