import { useEffect, useState } from "react";

const SessionExpiredModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      setIsOpen(true);
    };

    window.addEventListener("sessionExpired", handleSessionExpired);

    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, []);

  const handleLoginRedirect = () => {
    //Ensure user & token are cleared before redirecting
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("_admin_token");
    localStorage.removeItem("_admin_user");
    localStorage.removeItem("_impersonating");

    // 🔄 Redirect to login page
    window.location.href = "/";
  };

  return (
    isOpen && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md z-50">
        {/* Glassmorphism Modal */}
        <div className="bg-black/30 border border-gray-600 shadow-lg rounded-lg p-6 w-96 backdrop-blur-xl">
          <h2 className="text-2xl font-semibold text-white text-center">
            ⚠️ Session Expired
          </h2>
          <p className="mt-2 text-gray-200 text-center">
            Your session has expired. Please log in again to continue.
          </p>

          {/* Manual Login Button */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleLoginRedirect}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Login Now
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default SessionExpiredModal;
