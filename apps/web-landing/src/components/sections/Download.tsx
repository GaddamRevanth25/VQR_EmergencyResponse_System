
// SectionHeader not used
import { motion } from 'motion/react';
import { Download as DownloadIcon, Smartphone } from 'lucide-react';
import { Button } from '../ui/Button';

export function Download() {

  return (
    <section id="download" style={{ background: 'var(--bg-main)', position: 'relative', overflow: 'hidden' }}>
      {/* Background elements */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(220, 38, 38, 0.05) 0%, transparent 70%)',
        zIndex: 0,
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="glass-card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--color-primary)', 
            borderRadius: 'var(--radius-md)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 2rem',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Smartphone size={32} color="white" />
          </div>
          
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', marginBottom: '1rem' }}>Get VQR Today</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto 3rem', lineHeight: 1.6 }}>
            Download the VQR application to experience next-gen emergency vehicle response and automated crash safety.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ 
              background: 'var(--bg-element)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '1.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              minWidth: '250px'
            }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Android</h3>
              <p style={{ color: 'var(--color-primary-light)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>Coming Soon</p>
              <Button variant="outline" size="sm" className="w-full" disabled style={{ opacity: 0.5, cursor: 'not-allowed', marginTop: 'auto' }}>
                <DownloadIcon size={16} style={{ marginRight: '0.5rem' }} /> Download APK
              </Button>
            </div>

            <div style={{ 
              background: 'var(--bg-element)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--radius-md)', 
              padding: '1.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              minWidth: '250px'
            }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>iOS</h3>
              <p style={{ color: 'var(--color-primary-light)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>Coming Soon</p>
              <Button variant="outline" size="sm" className="w-full" disabled style={{ opacity: 0.5, cursor: 'not-allowed', marginTop: 'auto' }}>
                <DownloadIcon size={16} style={{ marginRight: '0.5rem' }} /> App Store
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
