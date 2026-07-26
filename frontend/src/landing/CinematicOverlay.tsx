/**
 * CinematicOverlay v3 – Optimized timings for ~6s total runtime.
 * All delays tightened. No dead time. Continuous flow.
 */
import React, { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LandingPhase } from "./useCinematicSequence";

interface Props { phase: LandingPhase; phaseProgress: number; }

// ─── Per-letter metallic reveal ──────────────────────────────────────────────
const MetallicLetter: React.FC<{ char: string; delay: number; size?: string }> = ({
  char, delay, size = "clamp(1.6rem,5.5vw,4.5rem)",
}) => (
  <span className="inline-block overflow-hidden" style={{ lineHeight: 1 }}>
    <motion.span
      className="inline-block"
      style={{
        fontFamily: "Inter,sans-serif",
        fontSize: size,
        fontWeight: 900,
        letterSpacing: "0.15em",
        // Visible gold gradient — not transparent
        background: "linear-gradient(175deg, #F5E27A 0%, #D4AF37 40%, #A07830 65%, #D4AF37 85%, #F5E27A 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        filter: "drop-shadow(0 0 12px rgba(212,175,55,0.5))",
        willChange: "transform,opacity",
      }}
      initial={{ y: "110%", opacity: 0, rotateX: -35 }}
      animate={{ y: 0, opacity: 1, rotateX: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  </span>
);

// ─── GOVERNMENT OF INDIA ─────────────────────────────────────────────────────
const GovReveal: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.5 } }}
      >
        {/* Seal line — draws itself elegantly */}
        <motion.div className="flex items-center space-x-4 mb-5"
          initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="h-px" style={{ width: 100, background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.7))" }} />
          <motion.div className="relative w-12 h-12 flex items-center justify-center"
            animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}>
            <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full">
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i / 24) * Math.PI * 2;
                return <line key={i} x1={24+Math.cos(a)*15} y1={24+Math.sin(a)*15}
                  x2={24+Math.cos(a)*19} y2={24+Math.sin(a)*19}
                  stroke="rgba(212,175,55,0.5)" strokeWidth="1" />;
              })}
              <circle cx="24" cy="24" r="12" fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="0.5"/>
              <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(212,175,55,0.12)" strokeWidth="0.5"/>
            </svg>
            <div className="w-3 h-3 rounded-full"
              style={{ background: "radial-gradient(circle,rgba(212,175,55,0.6) 0%,transparent 70%)", boxShadow: "0 0 10px 3px rgba(212,175,55,0.25)" }} />
          </motion.div>
          <div className="h-px" style={{ width: 100, background: "linear-gradient(90deg,rgba(212,175,55,0.7),transparent)" }} />
        </motion.div>

        {/* Letters — 40ms stagger fits elegantly in 2.2s phase */}
        <div className="flex flex-wrap justify-center relative" style={{ perspective: "600px" }}>
          {"GOVERNMENT OF INDIA".split("").map((ch, i) => (
            <MetallicLetter key={i} char={ch} delay={0.18 + i * 0.04} />
          ))}
        </div>

        {/* Gold dust line — draws after text settles */}
        <motion.div className="mt-3 h-px"
          style={{ width: "min(400px,80vw)", background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.5) 30%,rgba(245,226,122,0.8) 50%,rgba(212,175,55,0.5) 70%,transparent)", boxShadow: "0 0 10px 2px rgba(212,175,55,0.2)" }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 1.3, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Dust particles — slower, more elegant */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[0,1,2,3,4,5,6,7].map(i => (
            <motion.div key={i} className="absolute rounded-full"
              style={{ width: 2+(i%2), height: 2+(i%2), left:`${16+i*9}%`, top:"56%",
                background: `rgba(212,175,55,${0.3+(i%3)*0.1})`, willChange:"transform,opacity" }}
              animate={{ y:[0,-30-(i%3)*10], opacity:[0,0.65,0] }}
              transition={{ delay:1.0+i*0.06, duration:1.1, repeat:Infinity, repeatDelay:0.6+i*0.08, ease:"easeOut" }}
            />
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── MINISTRY OF HOME AFFAIRS ────────────────────────────────────────────────
const MinistryReveal: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.45 } }}
      >
        <motion.p className="font-mono tracking-[0.4em] uppercase mb-3 text-center"
          style={{ fontSize: "clamp(0.55rem,1.5vw,0.75rem)", color: "rgba(212,175,55,0.45)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        >GOVERNMENT OF INDIA</motion.p>

        <div className="relative overflow-hidden">
          <div className="flex flex-wrap justify-center">
            {"MINISTRY OF HOME AFFAIRS".split("").map((ch, i) => (
              <motion.span key={i} className="inline-block"
                style={{ fontSize: "clamp(1rem,3.2vw,2.4rem)", fontWeight: 700,
                  color: "rgba(212,175,55,0.78)", letterSpacing: "0.2em",
                  fontFamily: "Inter,sans-serif", textShadow: "0 0 18px rgba(212,175,55,0.22)" }}
                initial={{ opacity: 0, filter: "blur(5px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ delay: 0.15 + i * 0.032, duration: 0.4, ease: "easeOut" }}
              >{ch === " " ? "\u00A0" : ch}</motion.span>
            ))}
          </div>
          {/* Holographic sweep — unhurried */}
          <motion.div className="absolute inset-y-0 w-10 pointer-events-none"
            style={{ background: "linear-gradient(90deg,transparent,rgba(150,220,255,0.22) 40%,rgba(255,255,255,0.12) 50%,rgba(150,220,255,0.22) 60%,transparent)", filter: "blur(2px)" }}
            initial={{ left: "-5%" }} animate={{ left: "105%" }}
            transition={{ delay: 0.1, duration: 0.9, ease: "easeInOut" }}
          />
        </div>

        <motion.div className="mt-2.5 h-px"
          style={{ width: "min(340px,75vw)", background: "linear-gradient(90deg,transparent,rgba(212,175,55,0.4) 40%,rgba(212,175,55,0.4) 60%,transparent)" }}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.75, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.p className="mt-3 font-mono tracking-[0.35em] uppercase text-center"
          style={{ fontSize: "clamp(0.5rem,1.2vw,0.65rem)", color: "rgba(20,184,166,0.6)" }}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
        >AI Crime Intelligence Platform</motion.p>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── PREMIUM TRICOLOUR FLAG ───────────────────────────────────────────────────
const FlagSweep: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Saffron — deep, silk-lit */}
        <motion.div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height:"33.3%" }}
          initial={{ scaleX: 0, transformOrigin: "left" }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
        >
          <div className="absolute inset-0" style={{ background:"linear-gradient(180deg,#c8520e 0%,#b84810 50%,#c8520e 100%)", opacity:0.32 }}/>
          <motion.div className="absolute inset-y-0 w-1/3"
            style={{ background:"linear-gradient(90deg,transparent,rgba(255,160,60,0.3),transparent)" }}
            animate={{ left:["-40%","160%"] }} transition={{ duration:2.5, repeat:Infinity, repeatDelay:1.2, ease:"easeInOut" }}
          />
        </motion.div>

        {/* White — warm ivory */}
        <motion.div className="absolute inset-x-0 overflow-hidden" style={{ top:"33.3%", height:"33.4%" }}
          initial={{ scaleX: 0, transformOrigin: "left" }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16,1,0.3,1] }}
        >
          <div className="absolute inset-0" style={{ background:"rgba(255,252,240,0.11)" }}/>
          <motion.div className="absolute inset-y-0 w-1/3"
            style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,230,0.22),transparent)" }}
            animate={{ left:["-40%","160%"] }} transition={{ duration:2.5, repeat:Infinity, repeatDelay:1.5, delay:0.3, ease:"easeInOut" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div style={{ width:"clamp(38px,6.5vw,72px)", height:"clamp(38px,6.5vw,72px)" }}
              animate={{ rotate:360 }} transition={{ duration:16, repeat:Infinity, ease:"linear" }}>
              <svg viewBox="0 0 80 80" className="w-full h-full opacity-55">
                {Array.from({length:24}).map((_,k)=>{
                  const a=(k/24)*Math.PI*2;
                  return <line key={k} x1={40} y1={40} x2={40+Math.cos(a)*28} y2={40+Math.sin(a)*28} stroke="#1a3f8c" strokeWidth="1.6" strokeLinecap="round"/>;
                })}
                <circle cx="40" cy="40" r="28" fill="none" stroke="#1a3f8c" strokeWidth="1.6"/>
                <circle cx="40" cy="40" r="5" fill="#1a3f8c" opacity="0.75"/>
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Green — rich Indian green */}
        <motion.div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height:"33.3%" }}
          initial={{ scaleX: 0, transformOrigin: "left" }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16,1,0.3,1] }}
        >
          <div className="absolute inset-0" style={{ background:"linear-gradient(180deg,#0a6e1e 0%,#0d7a22 50%,#0a6e1e 100%)", opacity:0.32 }}/>
          <motion.div className="absolute inset-y-0 w-1/3"
            style={{ background:"linear-gradient(90deg,transparent,rgba(30,160,50,0.28),transparent)" }}
            animate={{ left:["-40%","160%"] }} transition={{ duration:2.5, repeat:Infinity, repeatDelay:1.0, delay:0.6, ease:"easeInOut" }}
          />
        </motion.div>

        {/* Cloth wave */}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ background:"transparent" }}
          animate={{ skewX:[0,0.35,-0.25,0.15,0] }} transition={{ duration:3.5, repeat:Infinity, ease:"easeInOut" }}
        />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background:"radial-gradient(ellipse 80% 70% at 50% 50%,transparent 40%,rgba(0,0,0,0.28) 100%)" }}
        />
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── INTELLIGENCE NETWORK ─────────────────────────────────────────────────────
const NODES = [{x:50,y:18},{x:28,y:38},{x:72,y:33},{x:50,y:52},{x:18,y:62},{x:78,y:58},{x:55,y:74},{x:32,y:78}];
const CONNS: [number,number][] = [[0,1],[0,2],[0,3],[1,3],[2,3],[3,4],[3,5],[3,6],[4,7],[5,6]];

const NetworkLines: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.svg className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.3 }}
      >
        <defs>
          <filter id="ng"><feGaussianBlur stdDeviation="0.4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {CONNS.map(([a,b],i)=>(
          <motion.line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y}
            stroke="rgba(20,184,166,0.35)" strokeWidth="0.18" filter="url(#ng)"
            initial={{ pathLength:0, opacity:0 }} animate={{ pathLength:1, opacity:1 }}
            transition={{ duration:0.4, delay:i*0.04, ease:"easeOut" }}
          />
        ))}
        {CONNS.map(([a,b],i)=>(
          <motion.circle key={`p${i}`} r="0.32" fill="rgba(20,184,166,0.9)" filter="url(#ng)">
            <animateMotion dur={`${1.2+i*0.15}s`} repeatCount="indefinite" begin={`${i*0.2}s`}
              path={`M ${NODES[a].x} ${NODES[a].y} L ${NODES[b].x} ${NODES[b].y}`}/>
          </motion.circle>
        ))}
        {NODES.map((n,i)=>(
          <motion.g key={i} filter="url(#ng)">
            <motion.circle cx={n.x} cy={n.y} r="1.0" fill="rgba(20,184,166,0.1)" stroke="rgba(20,184,166,0.65)" strokeWidth="0.2"
              initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.1+i*0.05 }}/>
            <motion.circle cx={n.x} cy={n.y} r="0.35" fill="rgba(20,184,166,1)"
              animate={{ r:[0.35,0.6,0.35], opacity:[1,0.4,1] }}
              transition={{ duration:2, repeat:Infinity, delay:i*0.15 }}/>
          </motion.g>
        ))}
      </motion.svg>
    )}
  </AnimatePresence>
);

// ─── AI SCAN GRID ─────────────────────────────────────────────────────────────
const AIScanGrid: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.3 }}
      >
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]">
          <defs><pattern id="tg" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(20,184,166,1)" strokeWidth="0.5"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#tg)"/>
        </svg>
        <motion.div className="absolute inset-x-0 h-px"
          style={{ background:"linear-gradient(90deg,transparent,rgba(20,184,166,0.9) 50%,transparent)", boxShadow:"0 0 14px 2px rgba(20,184,166,0.45)" }}
          animate={{ top:["-1px","101%"] }} transition={{ duration:2.2, repeat:Infinity, ease:"linear" }}
        />
        {[{x:"28%",y:"38%",i:.55},{x:"60%",y:"43%",i:.38},{x:"72%",y:"28%",i:.62}].map((b,k)=>(
          <motion.div key={k} className="absolute rounded-full"
            style={{ left:b.x, top:b.y, width:80, height:80, marginLeft:-40, marginTop:-40,
              background:`radial-gradient(circle,rgba(255,70,0,${b.i*0.4}) 0%,transparent 70%)` }}
            animate={{ scale:[1,1.3,1], opacity:[b.i,b.i*0.5,b.i] }}
            transition={{ duration:2.2+k*0.3, repeat:Infinity, delay:k*0.25 }}
          />
        ))}
        {[{p:[{t:26,l:26}],d:{borderRight:"none",borderBottom:"none"}},{p:[{t:26,r:26}],d:{borderLeft:"none",borderBottom:"none"}},{p:[{b:26,l:26}],d:{borderRight:"none",borderTop:"none"}},{p:[{b:26,r:26}],d:{borderLeft:"none",borderTop:"none"}}].map(({p,d},k)=>(
          <motion.div key={k} className="absolute w-9 h-9"
            style={{ ...p[0], border:"1.5px solid rgba(20,184,166,0.8)", borderRadius:2, ...d }}
            initial={{ opacity:0, scale:1.4 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.1+k*0.06 }}
          />
        ))}
        {[{x:"10%",y:"16%",t:"AI SCAN ACTIVE"},{x:"62%",y:"12%",t:"TRIAGE ONLINE"},{x:"58%",y:"84%",t:"THREAT: MODERATE"}].map((tag,k)=>(
          <motion.div key={k} className="absolute font-mono text-[9px] text-teal-400/75 tracking-widest uppercase"
            style={{ left:tag.x, top:tag.y }}
            initial={{ opacity:0 }} animate={{ opacity:[0,1,0.7,1] }} transition={{ delay:0.2+k*0.1, duration:0.3 }}
          >{tag.t}</motion.div>
        ))}
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── SENTINEL TITLE ───────────────────────────────────────────────────────────
const TitleReveal: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.7 }}
      >
        {/* Header line — drifts in gracefully */}
        <motion.div className="flex items-center space-x-3 mb-4"
          initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.1, duration:0.6, ease:[0.16,1,0.3,1] }}
        >
          <div className="h-px w-12" style={{ background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.5))" }}/>
          <span className="font-mono text-[10px] tracking-[0.4em] uppercase"
            style={{ color:"rgba(212,175,55,0.6)" }}>Government of India · MHA</span>
          <div className="h-px w-12" style={{ background:"linear-gradient(90deg,rgba(212,175,55,0.5),transparent)" }}/>
        </motion.div>

        {/* SENTINEL letters — 80ms stagger, dramatic build over ~0.65s per letter */}
        <div className="flex items-center justify-center" style={{ perspective:"700px" }}>
          {"SENTINEL".split("").map((ch, i) => (
            <div key={i} className="overflow-hidden" style={{ lineHeight:1 }}>
              <motion.span
                className="inline-block font-black uppercase"
                style={{
                  fontSize:"clamp(3.5rem,12vw,9.5rem)",
                  letterSpacing:"0.18em",
                  fontFamily:"Inter,sans-serif",
                  background:"linear-gradient(175deg,#F5E27A 0%,#D4AF37 35%,#A07830 60%,#D4AF37 80%,#F5E27A 100%)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text",
                  filter:"drop-shadow(0 0 36px rgba(212,175,55,0.42)) drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                  willChange:"transform,opacity",
                }}
                initial={{ y:"115%", opacity:0, rotateX:-45, filter:"blur(8px)" }}
                animate={{ y:0, opacity:1, rotateX:0, filter:"blur(0px)" }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.65, ease:[0.16,1,0.3,1] }}
              >{ch}</motion.span>
            </div>
          ))}
        </div>

        {/* Shimmer underline — appears after last letter lands */}
        <motion.div className="mt-1.5"
          style={{ width:"min(460px,85vw)", height:2,
            background:"linear-gradient(90deg,transparent 0%,#8B6914 15%,#D4AF37 40%,#F5E27A 50%,#D4AF37 60%,#8B6914 85%,transparent 100%)",
            boxShadow:"0 0 14px 2px rgba(212,175,55,0.32)" }}
          initial={{ scaleX:0 }} animate={{ scaleX:1 }}
          transition={{ delay: 0.9, duration: 0.6, ease:[0.16,1,0.3,1] }}
        />

        {/* Subtitle — slides up after underline */}
        <motion.p className="mt-3 text-center font-light tracking-[0.35em] uppercase"
          style={{ fontSize:"clamp(0.6rem,1.8vw,0.9rem)", color:"rgba(200,200,200,0.72)" }}
          initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
        >AI Crime Intelligence Platform</motion.p>

        {/* Ministry + AI line */}
        <motion.div className="mt-4 text-center space-y-1.5"
          initial={{ opacity:0 }} animate={{ opacity:1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          <p className="font-mono tracking-[0.3em] uppercase"
            style={{ fontSize:"clamp(0.55rem,1.4vw,0.75rem)", color:"rgba(212,175,55,0.48)" }}>
            Ministry of Home Affairs
          </p>
          <p className="font-mono tracking-[0.25em] uppercase"
            style={{ fontSize:"clamp(0.45rem,1.1vw,0.6rem)", color:"rgba(20,184,166,0.48)" }}>
            Powered by AI · BNS 2023 · NIC Infrastructure
          </p>
        </motion.div>

        {/* Agency badges — final element */}
        <motion.div className="flex items-center space-x-3 mt-5"
          initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          {["ISRO","NIC","DRDO","MHA"].map(b => (
            <div key={b} className="px-2.5 py-1 rounded font-mono uppercase"
              style={{ fontSize:"clamp(0.45rem,0.9vw,0.6rem)", letterSpacing:"0.2em",
                color:"rgba(212,175,55,0.48)", border:"1px solid rgba(212,175,55,0.14)",
                background:"rgba(212,175,55,0.03)" }}>
              {b}
            </div>
          ))}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Main Export ──────────────────────────────────────────────────────────────
const CinematicOverlay: React.FC<Props> = memo(({ phase }) => (
  <>
    <GovReveal      visible={phase === "gov_reveal"} />
    <MinistryReveal visible={phase === "ministry_reveal"} />
    <FlagSweep      visible={phase === "flag_sweep"} />
    <NetworkLines   visible={phase === "network_lines" || phase === "ai_scan"} />
    <AIScanGrid     visible={phase === "ai_scan"} />
    <TitleReveal    visible={phase === "title_reveal" || phase === "portal_transition"} />
  </>
));

CinematicOverlay.displayName = "CinematicOverlay";
export default CinematicOverlay;
