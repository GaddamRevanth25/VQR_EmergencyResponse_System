
import { SectionHeader } from '../ui/SectionHeader';
import { advantages } from '../../constants/siteData';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

export function WhyChoose() {

  return (
    <section id="why-choose" style={{ background: 'var(--bg-main)' }}>
      <div className="container">
        <SectionHeader 
          title="Why Choose VQR?" 
          subtitle="Built on modern technology to deliver reliability when you need it most."
        />
        
        <div className="grid grid-cols-2" style={{ maxWidth: '900px', margin: '0 auto' }}>
          {advantages.map((adv, i) => (
            <motion.div 
              key={i}
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              style={{
                display: 'flex',
                gap: '1rem',
                padding: '1.5rem',
              }}
            >
              <div style={{ color: 'var(--color-primary-light)', marginTop: '2px' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{adv.title}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>{adv.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
