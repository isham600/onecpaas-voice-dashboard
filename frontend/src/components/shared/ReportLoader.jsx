import { useEffect, useState } from "react";
import { FileTextOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGES = [
  "Connecting to database...",
  "Scanning recipient records...",
  "Applying your filters...",
  "Sorting by delivery date...",
  "Preparing your report...",
  "Almost ready...",
];

const ORBS = [
  { size: 260, color: "rgba(37,99,235,0.08)",  left: "10%", top: "20%", anim: "reportOrb0", dur: "7s"  },
  { size: 200, color: "rgba(16,185,129,0.07)", left: "70%", top: "60%", anim: "reportOrb1", dur: "9s"  },
  { size: 140, color: "rgba(99,102,241,0.09)", left: "50%", top: "10%", anim: "reportOrb2", dur: "11s" },
];

/**
 * AI-style loading overlay for data-heavy report pages.
 * Wrap the container in `position: relative` and render this inside it.
 * `topOffset` shifts the overlay below a fixed header (e.g. table column header row).
 */
const ReportLoader = ({ period = "", topOffset = 0 }) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const [dot,    setDot]    = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 1700);
    const t2 = setInterval(() => setDot((d)    => (d + 1) % 4), 380);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const dotStr = ".".repeat(dot + 1).padEnd(3, " ");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes reportPing {
          0%   { transform: scale(1);   opacity: 0.6; }
          80%  { transform: scale(2.2); opacity: 0;   }
          100% { transform: scale(2.2); opacity: 0;   }
        }
        @keyframes reportBar {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(400%);  }
        }
        @keyframes reportOrb0 {
          from { transform: translate(0, 0);     }
          to   { transform: translate(30px, 20px); }
        }
        @keyframes reportOrb1 {
          from { transform: translate(0, 0);       }
          to   { transform: translate(-20px, -30px); }
        }
        @keyframes reportOrb2 {
          from { transform: translate(0, 0);      }
          to   { transform: translate(25px, -15px); }
        }
      `}} />

      <div
        className="absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
        style={{
          top: topOffset,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* Drifting background orbs */}
        {ORBS.map((o, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none"
            style={{
              width: o.size, height: o.size,
              background: o.color,
              left: o.left, top: o.top,
              filter: "blur(50px)",
              animation: `${o.anim} ${o.dur} ease-in-out infinite alternate`,
            }} />
        ))}

        {/* Card */}
        <div
          className="relative flex flex-col items-center gap-5 px-12 py-10 rounded-3xl text-center"
          style={{
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 8px 40px rgba(37,99,235,0.10), 0 0 0 1px rgba(37,99,235,0.07)",
          }}
        >
          {/* Pulsing ring stack */}
          <div className="relative w-20 h-20 flex-shrink-0">
            {[0, 1, 2].map((i) => (
              <div key={i} className="absolute inset-0 rounded-full border-2"
                style={{
                  borderColor: `rgba(37,99,235,${0.25 - i * 0.07})`,
                  animation: `reportPing 2s ease-out ${i * 0.45}s infinite`,
                }} />
            ))}
            <div className="absolute inset-0 flex items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                boxShadow: "0 6px 20px rgba(37,99,235,0.35)",
              }}>
              <FileTextOutlined style={{ color: "#fff", fontSize: 22 }} />
            </div>
          </div>

          {/* Headline */}
          <div>
            <div className="text-xl font-bold text-gray-800 tracking-tight">
              Preparing your report
              <span className="inline-block w-7 text-left text-blue-500 font-bold">{dotStr}</span>
            </div>
            {period && (
              <div className="text-xs text-gray-400 mt-1">{period}</div>
            )}
          </div>

          {/* Cycling status */}
          <div className="h-5 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={msgIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
                className="text-sm font-medium"
                style={{ color: "#2563eb" }}
              >
                {MESSAGES[msgIdx]}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Indeterminate progress bar */}
          <div className="w-64 h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(37,99,235,0.10)" }}>
            <div className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg,transparent,#2563eb,#60a5fa,transparent)",
                animation: "reportBar 1.8s ease-in-out infinite",
                width: "50%",
              }} />
          </div>

          <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">
            Large date ranges may take a moment. Hang tight!
          </p>
        </div>
      </div>
    </>
  );
};

export default ReportLoader;
