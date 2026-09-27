import React, { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { motion } from "framer-motion";

const SignUpForm = lazy(() => import("../../components/Signup"));
const Login = lazy(() => import("../../components/Login"));
const ForgotPassword = lazy(() => import("../../components/Forgot"));

const FORM_TYPES = {
  SIGNUP: "signup",
  LOGIN: "login",
  FORGOT: "forgot",
};

const DEFAULT_BG_IMAGE = "/assets/images/png/bg-1.jpg";

const FALLBACK_DATA = {
  id: 36,
  logo: "",
  bg_image: DEFAULT_BG_IMAGE,
  footer: "Copyright © 2025",
  loginHeading: "Welcome to Our Platform",
  loginSubheading: "Powerful communication tools for your business",
  loginParagraph:
    "Connect with your customers using our advanced messaging solutions. Trusted by thousands of businesses worldwide.",
  domain: "https://wa32.nuke.co.in",
  whatsapp: 1,
  voice: 0,
  sms: 0,
  rcs: 0,
  number: 0,
  AI: 0,
  email: 0,
  support: 1,
  bulk_whatsapp: 0,
  telegram: 0,
  instagram: 0,
  manage_clients: 1,
  your_integration: 1,
  reseller_setting: 1,
  invoice: 0,
  username: "adminindew",
  created_at: "2024-12-02T23:10:03.000000Z",
  updated_at: "2025-04-06T09:11:25.000000Z",
};

function getStoredResellerData() {
  try {
    const stored = localStorage.getItem("resellerData");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error("Image URL missing"));
      return;
    }

    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

const Homepage = ({ setUser }) => {
  const [currentForm, setCurrentForm] = useState(FORM_TYPES.LOGIN);
  const [resellerData, setResellerData] = useState(
    () => getStoredResellerData() || FALLBACK_DATA,
  );
  const [visibleLogo, setVisibleLogo] = useState("");

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchResellerData = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/v1/resellers?domain=${encodeURIComponent(window.location.origin)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch reseller data");
        }

        const result = await response.json();

        if (result?.data) {
          if (!isMounted) return;
          setResellerData((prev) => ({
            ...FALLBACK_DATA,
            ...prev,
            ...result.data,
          }));
          localStorage.setItem("resellerData", JSON.stringify(result.data));
        } else {
          throw new Error("Invalid API response");
        }
      } catch (fetchError) {
        if (fetchError.name === "AbortError") return;
        // Log error for debugging but don't show user-facing error for reseller data
        console.warn("Reseller data fetch failed:", fetchError.message);
        setResellerData((prev) => prev || FALLBACK_DATA);
      }
    };

    fetchResellerData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const nextLogo = resellerData?.logo;

    if (!nextLogo) {
      setVisibleLogo("");
      return;
    }

    preloadImage(nextLogo)
      .then((loadedUrl) => {
        if (active) setVisibleLogo(loadedUrl);
      })
      .catch(() => {
        if (active) setVisibleLogo("");
      });

    return () => {
      active = false;
    };
  }, [resellerData?.logo]);

  const renderForm = useMemo(() => {
    const forms = {
      [FORM_TYPES.SIGNUP]: <SignUpForm onChangeForm={setCurrentForm} />,
      [FORM_TYPES.LOGIN]: (
        <Login onChangeForm={setCurrentForm} setUser={setUser} />
      ),
      [FORM_TYPES.FORGOT]: <ForgotPassword onChangeForm={setCurrentForm} />,
    };

    return forms[currentForm] || forms[FORM_TYPES.LOGIN];
  }, [currentForm, setUser]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50">
      {visibleLogo && (
        <motion.img
          src={visibleLogo}
          alt="Company Logo"
          className="absolute left-4 top-4 z-50 h-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onError={() => setVisibleLogo("")}
        />
      )}

      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[400px_minmax(0,1fr)] lg:grid-cols-[600px_minmax(0,1fr)]">
        <div className="relative hidden md:block md:sticky md:top-0 md:h-screen">
          <div className="h-full w-full bg-slate-950" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center overflow-y-auto pb-4 pt-20 md:col-start-2 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-xl px-4 md:px-8"
          >
            <Suspense fallback={<div>Loading...</div>}>{renderForm}</Suspense>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Homepage);
