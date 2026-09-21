// React import not needed with new JSX transform
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/sections/Hero';
import { About } from './components/sections/About';
import { Features } from './components/sections/Features';
import { HowItWorks } from './components/sections/HowItWorks';
import { WhyChoose } from './components/sections/WhyChoose';
import { Screenshots } from './components/sections/Screenshots';
import { Technology } from './components/sections/Technology';
import { Download } from './components/sections/Download';
import { FAQ } from './components/sections/FAQ';

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Features />
        <HowItWorks />
        <WhyChoose />
        <Screenshots />
        <Technology />
        <Download />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}

export default App;
