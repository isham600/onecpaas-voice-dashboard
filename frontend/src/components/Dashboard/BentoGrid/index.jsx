import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const BentoGrid = ({ children, className = "" }) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`
        grid
        grid-cols-1
        md:grid-cols-2
        lg:grid-cols-4
        gap-4
        lg:gap-6
        auto-rows-[minmax(180px,auto)]
        w-full
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

export default BentoGrid;
