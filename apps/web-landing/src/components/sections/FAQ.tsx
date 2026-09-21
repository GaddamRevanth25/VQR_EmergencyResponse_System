import { useState } from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { faq as faqs } from '../../constants/siteData';
import { motion } from 'motion/react';
import { Plus, Minus } from 'lucide-react';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" style={{ background: 'var(--bg-main)' }}>
      <div className="container">
        <SectionHeader 
          title="Frequently Asked Questions" 
          subtitle="Everything you need to know about the VQR Emergency Response System."
        />
        
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faqItem: { question: string, answer: string }, i: number) => {
            const isOpen = openIndex === i;
            return (
              <motion.div 
                key={i}
                className="glass-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                style={{
                  border: `1px solid ${isOpen ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  overflow: 'hidden',
                }}
              >
                <button 
                  onClick={() => toggleFaq(i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.5rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-main)',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  {faqItem.question}
                  {isOpen ? <Minus size={20} color="var(--color-primary)" /> : <Plus size={20} color="var(--text-muted)" />}
                </button>
                
                <div style={{
                  maxHeight: isOpen ? '200px' : '0',
                  opacity: isOpen ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  padding: isOpen ? '0 1.5rem 1.5rem' : '0 1.5rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.6,
                }}>
                  {faqItem.answer}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
