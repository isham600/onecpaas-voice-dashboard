import { createContext, useState, useEffect } from "react";

// Create a context
export const AppContext = createContext();

// Provider Component
export const AppProvider = ({ children }) => {
  const [reload, setReload] = useState(false);
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Function to update user state and local storage
  const updateUser = (newUser) => {
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const contextValue = {
    reload,
    setReload,
    user,
    updateUser,
  };

  // Watch for changes to the `user` and ensure localStorage is synced
  useEffect(() => {
    if (!user) {
      localStorage.removeItem("user");
    }
  }, [user]);

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};
