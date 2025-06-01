import { motion } from "framer-motion";

const SpotifyLoader = ({ message = "Loading" }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex items-center justify-center bg-[#121212] z-50"
    >
      <div className="relative w-32 h-32">
        {/* Turtle body */}
        <div className="absolute w-24 h-24 bg-[#1db954] rounded-full top-4 left-4 animate-pulse"></div>
        
        {/* Turtle head */}
        <div className="absolute w-8 h-8 bg-[#1db954] rounded-full top-0 left-1/2 -translate-x-1/2 animate-bounce"></div>
        
        {/* Turtle legs */}
        <div className="absolute w-6 h-6 bg-[#1db954] rounded-full top-8 left-0 animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute w-6 h-6 bg-[#1db954] rounded-full top-8 right-0 animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute w-6 h-6 bg-[#1db954] rounded-full bottom-0 left-8 animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute w-6 h-6 bg-[#1db954] rounded-full bottom-0 right-8 animate-[spin_3s_linear_infinite]"></div>
        
        {/* Loading text */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <p className="text-[#1db954] font-medium text-lg">{message}</p>
          <div className="flex gap-1 justify-center mt-2">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 bg-[#1db954] rounded-full"
            />
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
              className="w-2 h-2 bg-[#1db954] rounded-full"
            />
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.4 }}
              className="w-2 h-2 bg-[#1db954] rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SpotifyLoader; 