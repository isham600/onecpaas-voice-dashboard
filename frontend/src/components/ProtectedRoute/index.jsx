import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { AppContext } from "../../utils/Context";

const ProtectedRoute = () => {
  const { user } = useContext(AppContext);

  // Check if user exists and token is valid
  const isAuthenticated = user && localStorage.getItem("token");

  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
