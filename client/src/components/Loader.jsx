import React from 'react';
import { motion } from 'framer-motion';

export default function Loader({ text = "Loading..." }) {
  return (
    <div className="loader-container">
      <div className="purple-dotted-loader"></div>
      <motion.div 
        animate={{ opacity: [0.3, 1, 0.3] }} 
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{ color: 'var(--text-muted)' }}
      >
        {text}
      </motion.div>
    </div>
  );
}
