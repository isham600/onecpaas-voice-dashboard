import React from "react";
import { motion } from "framer-motion";

const cellVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
};

const sizeClasses = {
  hero: "col-span-1 row-span-1 md:col-span-2 md:row-span-2",
  wide: "col-span-1 md:col-span-2",
  full: "col-span-1 md:col-span-2 lg:col-span-4",
  tall: "col-span-1 row-span-1 md:row-span-2",
  standard: "col-span-1 row-span-1",
};

const BentoCell = ({
  size = "standard",
  children,
  className = "",
  order,
}) => {
  return (
    <motion.div
      variants={cellVariants}
      className={`
        ${sizeClasses[size] || sizeClasses.standard}
        ${className}
      `}
      style={order !== undefined ? { order } : undefined}
    >
      {children}
    </motion.div>
  );
};

export default BentoCell;
