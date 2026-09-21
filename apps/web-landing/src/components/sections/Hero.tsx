import { ShieldAlert, ArrowRight, Zap, Activity, MapPin, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';

export function Hero() {
  const sectionStyles: React.CSSProperties = {
    padding: '8rem 0 5rem',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  const bgStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at top right, rgba(220, 38, 38, 0.15) 0%, transparent 45%), radial-gradient(circle at bottom left, rgba(37, 99, 235, 0.1) 0%, transparent 45%)',
    zIndex: -1,
  };

  const gridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '3.5rem',
    alignItems: 'center',
  };

  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(220, 38, 38, 0.1)',
    color: 'var(--color-primary-light)',
    padding: '0.5rem 1rem',
    borderRadius: '2rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '1.5rem',
    border: '1px solid rgba(220, 38, 38, 0.2)',
  };

  return (
    <section id="hero" style={sectionStyles}>
      <div style={bgStyles} />
      <div className="container">
        <div style={gridStyles}>
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div style={badgeStyles}>
              <ShieldAlert size={16} />
              <span>Next-Gen Emergency Response</span>
            </div>
            
            <h1 className="mb-6" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}>
              When Seconds Count, <br />
              <span className="text-gradient-primary">VQR Responds.</span>
            </h1>
            
            <p className="mb-8" style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.6 }}>
              Advanced emergency vehicle identification and automated crash detection. Real-time alerts, exact GPS locations, and seamless communication for rapid response.
            </p>
            
            <div className="flex gap-4 flex-wrap">
              <Button size="lg" onClick={() => document.getElementById('download')?.scrollIntoView()}>
                Download App <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
              </Button>
              <Button variant="outline" size="lg" onClick={() => document.getElementById('how-it-works')?.scrollIntoView()}>
                Learn How It Works
              </Button>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}
          >
            {/* System Telemetry & Protection Dashboard Card */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              style={{
                width: '100%',
                maxWidth: '440px',
                position: 'relative',
              }}
            >
              {/* Background ambient glow */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '85%',
                height: '85%',
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(37, 99, 235, 0.15) 100%)',
                borderRadius: '50%',
                filter: 'blur(50px)',
                opacity: 0.6,
              }} className="animate-pulse" />
              
              <div className="glass-card" style={{
                padding: '2rem',
                borderRadius: '24px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-hover)',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}>
                {/* Header Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <ShieldAlert size={26} color="var(--color-primary)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>VQR Shield</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pre-Trip Readiness Active</div>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} className="animate-pulse" />
                    ONLINE
                  </div>
                </div>

                {/* Telemetry Feature Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div style={{
                    background: 'var(--bg-element)',
                    padding: '1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-primary-light)', marginBottom: '0.3rem' }}>
                      <Activity size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Crash Detection</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>AI & Sensors Armed</div>
                  </div>

                  <div style={{
                    background: 'var(--bg-element)',
                    padding: '1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-blue)', marginBottom: '0.3rem' }}>
                      <MapPin size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Live GPS</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Precision Tracking</div>
                  </div>

                  <div style={{
                    background: 'var(--bg-element)',
                    padding: '1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-cyan)', marginBottom: '0.3rem' }}>
                      <Zap size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>QR Decal</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Instant Reg Query</div>
                  </div>

                  <div style={{
                    background: 'var(--bg-element)',
                    padding: '1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', marginBottom: '0.3rem' }}>
                      <Bell size={16} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Emergency SMS</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Auto Contacts Alert</div>
                  </div>
                </div>

                {/* Simulated SOS Dispatch Trigger */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.05) 100%)',
                  borderRadius: '14px',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      boxShadow: '0 0 10px var(--color-primary)'
                    }} className="animate-pulse" />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>One-Tap Emergency SOS</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dispatches location & medical info</div>
                    </div>
                  </div>
                  <div style={{
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    READY
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
