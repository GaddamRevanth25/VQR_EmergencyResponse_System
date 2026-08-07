
import { SectionHeader } from '../ui/SectionHeader';
import { features } from '../../constants/siteData';
import { motion } from 'motion/react';

export function Features() {

  return (
    <section id="features" style={{ background: 'var(--bg-main)' }}>
      <div className="container">
        <SectionHeader 
          title="Powerful Capabilities" 
          subtitle="Everything you need to ensure rapid response in emergency situations, powered by advanced ML and cloud infrastructure."
        />
        
        <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
          {features.map((feature, i) => (
            <motion.div 
              key={i}
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: (i % 2) * 0.1, ease: "easeOut" }}
              style={{
                padding: '2rem',
                display: 'flex',
                gap: '1.5rem',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                }}>
                  <feature.icon size={24} />
                </div>
              </div>
              
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
