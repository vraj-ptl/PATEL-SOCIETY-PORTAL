import React from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Award, Code, Terminal, ExternalLink, Linkedin } from 'lucide-react';
import { playHoverSound } from '../utils/sounds';

export default function About() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-gradient" style={{ marginBottom: '2rem' }}>About the Developer</h1>

      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem' 
        }}
      >
        {/* Profile Card */}
        <motion.div 
          variants={itemVariants} 
          className="glass-panel" 
          style={{ 
            padding: '2rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%)',
            borderColor: 'rgba(139, 92, 246, 0.3)'
          }}
        >
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              padding: '4px',
              background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
              marginBottom: '1.5rem',
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)'
            }}
          >
            <img 
              src="/vraj_patel.jpg" 
              alt="Vraj Patel" 
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = 'https://ui-avatars.com/api/?name=Vraj+Patel&background=0D8ABC&color=fff&size=200';
              }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                backgroundColor: '#1e293b'
              }}
            />
          </motion.div>

          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', color: '#fff' }}>Vraj Patel</h2>
          <p style={{ color: '#a78bfa', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Lead Developer & Creator
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', color: '#38bdf8' }}>
                <Phone size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact Number</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#fff' }}>6358866816</p>
              </div>
            </div>

            <a 
              href="https://www.linkedin.com/in/vraj-patel-9bb598361?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', transition: 'all 0.3s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10, 102, 194, 0.1)'; e.currentTarget.style.borderColor = 'rgba(10, 102, 194, 0.3)'; playHoverSound(); }} 
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
            >
              <div style={{ padding: '0.5rem', background: 'rgba(10, 102, 194, 0.1)', borderRadius: '8px', color: '#0a66c2' }}>
                <Linkedin size={20} />
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>LinkedIn Profile</p>
                <p style={{ margin: 0, fontWeight: 500, color: '#fff' }}>Connect with me</p>
              </div>
              <ExternalLink size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            </a>
          </div>
        </motion.div>

        {/* Bio & Details Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#fff' }}>
              <Terminal size={22} color="#38bdf8" /> 
              About Me
            </h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '0.95rem' }}>
              I am a passionate software developer dedicated to building elegant, high-performance, and secure digital solutions. I designed and developed the <strong>Patel Society Portal</strong> from the ground up to streamline society management, financial tracking, and member administration.
            </p>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '0.95rem', marginTop: '1rem' }}>
              My focus is on creating premium user experiences through modern web technologies, specifically leveraging precise animations, responsive glassmorphism interfaces, and robust backend architectures.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#fff' }}>
              <Code size={22} color="#10b981" /> 
              Project Highlights
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                "Custom 3D Animated Backgrounds",
                "Advanced Financial Dashboard & Analytics",
                "Secure Role-Based Active Authentication",
                "Interactive Web Audio Sound Effects",
                "Framer Motion Fluid Transitions"
              ].map((highlight, index) => (
                <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <Award size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{highlight}</span>
                </li>
              ))}
            </ul>
          </motion.div>

        </div>
      </motion.div>
    </motion.div>
  );
}
