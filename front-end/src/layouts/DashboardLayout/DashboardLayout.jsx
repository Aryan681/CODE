"use client";
import React, { useId, useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  FiHome,
  FiCode,
  FiClock,
  FiGrid,
  FiMusic,
  FiGithub,
  FiSettings,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion } from "framer-motion";

const features = [
  {
    id: "home",
    icon: <FiHome className="text-xl" />,
    title: "Home",
    description: "Return to homepage",
    color: "text-blue-400",
  },
  {
    id: "dashboard",
    icon: <FiGrid className="text-xl" />,
    title: "Dashboard",
    description: "Main dashboard overview",
    color: "text-green-400",
  },
  {
    id: "code",
    icon: <FiCode className="text-xl" />,
    title: "Code Editor",
    description: "Write & execute code",
    color: "text-cyan-400",
  },
  {
    id: "timer",
    icon: <FiClock className="text-xl" />,
    title: "Pomodoro",
    description: "Focus sessions",
    color: "text-purple-400",
  },
  {
    id: "spotify",
    icon: <FiMusic className="text-xl" />,
    title: "Spotify",
    description: "Music integration",
    color: "text-emerald-400",
  },
  {
    id: "github",
    icon: <FiGithub className="text-xl" />,
    title: "GitHub",
    description: "Repo management",
    color: "text-amber-400",
  },
];

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const pathSegment = location.pathname.split("/")[2] || "dashboard";
  const [activeFeature, setActiveFeature] = useState(pathSegment);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [particlesInit, setParticlesInit] = useState(false);
  const sidebarRef = useRef();
  const typeRef = useRef();
  const generatedId = useId();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await axios.post(
        "http://localhost:3000/api/auth/logout",
        { refreshToken },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setParticlesInit(true);
    });
  }, []);

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.from(sidebarRef.current, {
        x: -300,
        duration: 0.8,
        ease: "power3.out",
      });
    }
  }, []);

  useEffect(() => {
    if (sidebarRef.current) {
      const xValue = isSidebarCollapsed ? 0 : -15;
      gsap.to(sidebarRef.current, {
        x: xValue + 5,
        duration: 0.8,
        ease: "power3.out",
      });
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (isSidebarCollapsed || !typeRef.current) return;

    const words = ["workspace", "cloud", "ide", "runtime", "terminal"];
    let wordIndex = 0;
    let charIndex = 0;
    let typingForward = true;
    const timers = [];

    const typeWriterLoop = () => {
      const word = words[wordIndex];
      if (typingForward) {
        typeRef.current.textContent = word.substring(0, charIndex + 1);
        charIndex++;
        if (charIndex === word.length) {
          typingForward = false;
          timers.push(setTimeout(typeWriterLoop, 1200));
          return;
        }
      } else {
        typeRef.current.textContent = word.substring(0, charIndex - 1);
        charIndex--;
        if (charIndex === 0) {
          typingForward = true;
          wordIndex = (wordIndex + 1) % words.length;
        }
      }
      timers.push(setTimeout(typeWriterLoop, typingForward ? 100 : 40));
    };

    typeWriterLoop();

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isSidebarCollapsed]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if sidebar is expanded and click is outside
      if (!isSidebarCollapsed && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarCollapsed(true);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarCollapsed]);

  const handleFeatureClick = (featureId) => {
    setActiveFeature(featureId);
    switch (featureId) {
      case "dashboard":
        navigate("/dashboard");
        break;
      case "home":
        navigate("/");
        break;
      default:
        navigate(`/dashboard/${featureId}`);
        break;
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const DashboardContent = () => (
    <motion.div
      className="h-full w-full relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {particlesInit && (
        <Particles
          id={generatedId}
          className="absolute inset-0 -z-10"
          options={{
            background: { color: { value: "transparent" } },
            fullScreen: { enable: false, zIndex: -1 },
            fpsLimit: 120,
            interactivity: {
              events: {
                onClick: { enable: true, mode: "push" },
                onHover: { enable: true, mode: "repulse" },
                resize: true,
              },
              modes: {
                push: { quantity: 4 },
                repulse: { distance: 100, duration: 0.4 },
              },
            },
            particles: {
              color: { value: "#3b82f6" },
              move: {
                direction: "none",
                enable: true,
                outModes: { default: "bounce" },
                random: false,
                speed: 1,
                straight: false,
              },
              number: { density: { enable: true, area: 800 }, value: 80 },
              opacity: { value: 0.5 },
              shape: { type: "circle" },
              size: { value: { min: 1, max: 3 } },
            },
            detectRetina: true,
          }}
        />
      )}
      <div className="relative z-10 h-full w-full flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-semibold text-gray-100 mb-4 tracking-wide">
            Welcome to Your Dashboard
          </h2>
          <p className="text-gray-400 text-lg">
            Select a feature from the sidebar to get started
          </p>
        </div>
      </div>
    </motion.div>
  );

  // And the usage remains the same:
  <div className="relative z-10 h-full w-full">
    {activeFeature === "dashboard" ? <DashboardContent /> : <Outlet />}
  </div>;
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <motion.aside
        ref={sidebarRef}
        className={`
          ${isSidebarCollapsed ? "w-20" : "w-64"}
          bg-gray-900/80 border-r border-gray-800 flex flex-col p-4 backdrop-blur-sm
          fixed h-full z-20
        `}
      >
        <div
          className={`mb-8 p-4 ${
            isSidebarCollapsed ? "flex justify-center" : ""
          }`}
        >
          {isSidebarCollapsed ? (
            <button
              onClick={toggleSidebar}
              className="flex items-center space-x-2 group focus:outline-none"
            >
              <h1 className="text-2xl font-mono font-bold group-hover:text-cyan-400 transition-colors duration-200">
                <span className="text-cyan-400">&lt;</span>
                <span className="text-gray-100">Eco</span>
                <span className="text-cyan-400">&gt;</span>
              </h1>
            </button>
          ) : (
            <>
              <button
                onClick={toggleSidebar}
                className="flex items-center space-x-2 group focus:outline-none"
              >
                <h1 className="text-2xl font-mono font-bold group-hover:text-cyan-400 transition-colors duration-200">
                  <span className="text-cyan-400">&lt;</span>
                  <span className="text-gray-100">Eco</span>
                  <span className="text-cyan-400">&gt;</span>
                </h1>
              </button>

              <p className="text-gray-400 text-sm font-mono mt-1">
                dev<span className="text-gray-600">.</span>
                <span className="text-amber-400" ref={typeRef}></span>
                <span className="text-cyan-400">()</span>
              </p>
            </>
          )}
        </div>
        {/* Collapse/Expand Button */}

        <nav className="flex-1 overflow-hidden">
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature.id}>
                <button
                  onClick={() => handleFeatureClick(feature.id)}
                  className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                    activeFeature === feature.id
                      ? "bg-gray-800/50 border-l-4 border-cyan-400"
                      : "hover:bg-gray-800/30"
                  }`}
                  title={isSidebarCollapsed ? feature.title : ""}
                >
                  <span
                    className={`${isSidebarCollapsed ? "mx-auto" : "mr-3"} ${
                      feature.color
                    }`}
                  >
                    {feature.icon}
                  </span>
                  {!isSidebarCollapsed && (
                    <div className="text-left overflow-hidden transition-all duration-200">
                      <p className="font-medium truncate">{feature.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {feature.description}
                      </p>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {/* lower icons */}
        <div className="mt-auto h-30 p-2 border-t space-y-2 border-gray-800">
          <button
            className={`flex items-center w-full p-2 rounded-lg hover:bg-gray-800/30 ${
              isSidebarCollapsed ? "justify-center" : ""
            }`}
            title={isSidebarCollapsed ? "Settings" : ""}
          >
            <FiSettings
              className={`text-gray-400 ${isSidebarCollapsed ? "" : "mr-3"}`}
            />
            {!isSidebarCollapsed && <span className="truncate">Settings</span>}
          </button>
          <button
            className={`flex items-center w-full p-2 rounded-lg hover:bg-gray-800/30 text-red-400 ${
              isSidebarCollapsed ? "justify-center" : ""
            }`}
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Logout" : ""}
          >
            <FiLogOut className={isSidebarCollapsed ? "" : "mr-3"} />
            {!isSidebarCollapsed && <span className="truncate">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main
        className={`
          flex-1 overflow-y-auto transition-all duration-300
          ${isSidebarCollapsed ? "ml-20" : "ml-0"}
          h-full relative
        `}
      >
        <div className="relative z-10 h-full w-full">
          <Outlet />
        </div>

        {/* Footer */}
        <div
          className={`
            fixed bottom-0 h-12 bg-gray-900/80 border-t border-gray-800
            transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? "left-20" : "left-61"}
            right-0
          `}
        >
          <div className="absolute inset-0 flex items-center font-mono text-xs text-gray-400 justify-center">
            <p>Echo Dashboard | Version 1.0</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
