
import { SectionHeader } from '../ui/SectionHeader';
import { technologies } from '../../constants/siteData';
import { motion } from 'motion/react';
import { Server, Smartphone, Database, BrainCircuit, Lock } from 'lucide-react';

export function Technology() {

  const categories = [
    { title: 'Frontend & Mobile', icon: Smartphone, items: technologies.frontend, color: 'var(--color-blue)' },
    { title: 'Backend Services', icon: Server, items: technologies.backend, color: 'var(--color-primary)' },
    { title: 'Machine Learning', icon: BrainCircuit, items: technologies.ml, color: 'var(--color-cyan)' },
    { title: 'Infrastructure', icon: Database, items: technologies.cloud, color: '#f59e0b' },
    { title: 'Security', icon: Lock, items: technologies.auth, color: '#10b981' },
  ];

  return (
    <section id="technology" style={{ background: 'var(--bg-main)' }}>
      <div className="container">
        <SectionHeader 
          title="Powered by Cutting-Edge Tech" 
          subtitle="A robust, scalable, and secure architecture built to handle critical emergencies."
        />
        
        <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
          {categories.map((cat, i) => (
            <motion.div 
              key={i}
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              style={{
                padding: '2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <cat.icon color={cat.color} size={24} />
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{cat.title}</h3>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {cat.items.map((tech, j) => (
                  <span 
                    key={j}
                    style={{
                      background: 'var(--bg-element)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      fontWeight: 500,
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
