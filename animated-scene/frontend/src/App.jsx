import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import AuthModal from './AuthModal';
import AdminDashboard from './pages/AdminDashboard';

const TOTAL_FRAMES = 231;

function HackerTitle({ text }) {
  const [displayText, setDisplayText] = useState(text);
  
  useEffect(() => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+_-=";
    let interval = null;
    
    const scramble = () => {
      let iteration = 0;
      clearInterval(interval);
      
      interval = setInterval(() => {
        setDisplayText(
          text.split("")
            .map((char, index) => {
              if (char === " ") return " ";
              if (index < iteration) {
                return text[index];
              }
              return letters[Math.floor(Math.random() * letters.length)];
            })
            .join("")
        );
        
        if (iteration >= text.length) {
          clearInterval(interval);
        }
        
        iteration += 1 / 4; 
      }, 30);
    };

    scramble();
    const loop = setInterval(scramble, 6000);
    
    return () => {
      clearInterval(interval);
      clearInterval(loop);
    };
  }, [text]);

  return <h2 className="hacker-title">{displayText}</h2>;
}

function App() {
  const canvasRef = useRef(null);
  const cinematicLayerRef = useRef(null);
  const heroContentRef = useRef(null);
  const scrollProgressTextRef = useRef(null);
  const topNavRef = useRef(null);
  
  // Refs for the 5 cinematic points
  const p1Ref = useRef(null);
  const p2Ref = useRef(null);
  const p3Ref = useRef(null);
  const p4Ref = useRef(null);
  const p5Ref = useRef(null);
  
  const imagesRef = useRef([]);
  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);

  const [cyberData, setCyberData] = useState({ hex1: '0x00F9A', hex2: '0x1A2B' });
  const [authOpen, setAuthOpen] = useState(false);
  const [authRoute, setAuthRoute] = useState('/custodian');

  useEffect(() => {
    const interval = setInterval(() => {
      setCyberData({
        hex1: '0x' + Math.floor(Math.random() * 16777215).toString(16).toUpperCase(),
        hex2: '0x' + Math.floor(Math.random() * 16777215).toString(16).toUpperCase()
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const images = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(3, '0');
      img.src = `/frames/frame_${frameNum}.jpg`;
      images.push(img);
    }
    imagesRef.current = images;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; 
    
    const ctx = canvas.getContext('2d');
    let animationId;

    const resizeCanvas = () => {
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
         canvas.width = window.innerWidth;
         canvas.height = window.innerHeight;
         lastDrawnFrameRef.current = -1;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const handleScroll = () => {
      if (authOpen) return; // Disable scroll animations if modal is open

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;
      
      targetFrameRef.current = Math.min(TOTAL_FRAMES - 1, fraction * (TOTAL_FRAMES - 1));
      
      // Control main overlays
      if (fraction > 0.02) {
         if (cinematicLayerRef.current) cinematicLayerRef.current.classList.add('visible');
         if (heroContentRef.current) heroContentRef.current.classList.add('fade-out');
         if (topNavRef.current) topNavRef.current.classList.add('fade-out');
      } else {
         if (cinematicLayerRef.current) cinematicLayerRef.current.classList.remove('visible');
         if (heroContentRef.current) heroContentRef.current.classList.remove('fade-out');
         if (topNavRef.current) topNavRef.current.classList.remove('fade-out');
      }

      // Control 5 dynamic points based on scroll percentage ranges
      const togglePoint = (ref, start, end) => {
        if (ref.current) {
          if (fraction >= start && fraction < end) {
            ref.current.classList.add('visible');
          } else {
            ref.current.classList.remove('visible');
          }
        }
      };

      togglePoint(p1Ref, 0.05, 0.22); // Point 1
      togglePoint(p2Ref, 0.22, 0.40); // Point 2
      togglePoint(p3Ref, 0.40, 0.58); // Point 3
      togglePoint(p4Ref, 0.58, 0.76); // Point 4
      togglePoint(p5Ref, 0.76, 1.00); // Point 5
      
      if (scrollProgressTextRef.current) {
         scrollProgressTextRef.current.innerText = `SYS_SYNC: ${Math.floor(fraction * 100)}%`;
      }
    };

    window.addEventListener('scroll', handleScroll);

    const renderFrame = (frameIndex) => {
        let img = imagesRef.current[frameIndex];
        
        if (img && img.complete && img.naturalWidth > 0) {
           const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
           const zoomScale = baseScale * 1.15; 
           const x = (canvas.width / 2) - (img.width / 2) * zoomScale;
           const y = (canvas.height / 2) - (img.height / 2) * zoomScale;
           
           ctx.clearRect(0, 0, canvas.width, canvas.height);
           ctx.drawImage(img, x, y, img.width * zoomScale, img.height * zoomScale);
           lastDrawnFrameRef.current = frameIndex;
        }
    }

    const tick = () => {
      if (authOpen) {
         animationId = requestAnimationFrame(tick);
         return; // pause ticking if modal open
      }
      
      const diff = targetFrameRef.current - currentFrameRef.current;
      
      if (Math.abs(diff) > 0.1) {
         currentFrameRef.current += diff * 0.1;
      } else {
         currentFrameRef.current = targetFrameRef.current;
      }

      const roundedFrame = Math.floor(currentFrameRef.current);
      
      if (roundedFrame !== lastDrawnFrameRef.current) {
         renderFrame(roundedFrame);
      }
      
      animationId = requestAnimationFrame(tick);
    };
    
    animationId = requestAnimationFrame(tick);
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [authOpen]);

  if (authOpen && authRoute === '/admin') {
    return <AdminDashboard onBack={() => setAuthOpen(false)} />;
  }

  return (
    <div className="scroll-container">
      {authOpen && authRoute !== '/admin' && <AuthModal onClose={() => setAuthOpen(false)} initialRoute={authRoute} />}
      
      {/* CYBERPUNK HUD OVERLAYS */}
      <div className="cyber-hud">
        <div className="hud-corner top-left"></div>
        <div className="hud-corner top-right"></div>
        <div className="hud-corner bottom-left"></div>
        <div className="hud-corner bottom-right"></div>
        
        <div className="hud-data-stream left-stream">
          SYS.SEC.1092<br/>
          ENC_RATE: 99.9%<br/>
          NODE: ACTIVE<br/>
          MEM: {cyberData.hex1}
        </div>
        
        <div className="hud-data-stream right-stream">
          TRGT: KAVACH_CORE<br/>
          PORT: 443 [SECURE]<br/>
          STATUS: ONLINE<br/>
          HASH: {cyberData.hex2}
        </div>

        <div className="hud-data-stream bottom-center" ref={scrollProgressTextRef}>
          SYS_SYNC: 0%
        </div>
      </div>

      <div className="sticky-scene">
        <canvas ref={canvasRef} className="video-canvas"></canvas>
        <div className="vignette-overlay"></div>
        
        {/* WATERMARK OVERLAY */}
        <img src="/custom-logo.png" className="watermark-overlay" alt="Abhedyah Watermark" />

        {/* NEW CINEMATIC TEXT LAYER */}
        <div ref={cinematicLayerRef} className="cinematic-layer">
          
          <div ref={p1Ref} className="cine-point left">
            <p className="cine-label">01 // THE PROBLEM</p>
            <h2>Human Trust</h2>
            <h2 className="indent">Is Broken.</h2>
            <p className="cine-description">
              Traditional exams fail because they rely on people. A single compromised individual can leak a paper, destroying the future and hard work of millions.
            </p>
          </div>
          
          <div ref={p2Ref} className="cine-point right">
            <p className="cine-label">02 // CRYPTOGRAPHIC SHIELD</p>
            <p className="cine-description-top">
              KAVACH replaces human dependency with cryptographic certainty. Using AES-256 encryption, the question paper is mathematically locked and inaccessible.
            </p>
            <h2>Mathematics</h2>
            <h2>Never Lies.</h2>
          </div>

          <div ref={p3Ref} className="cine-point left">
            <p className="cine-label">03 // THE MECHANISM</p>
            <h2>Double-Gate</h2>
            <h2 className="indent">Unlock.</h2>
            <p className="cine-description">
              No single person holds the key. The system requires a simultaneous Time-Gate and a Multi-Party Quorum (Shamir's Secret Sharing) to decrypt the exam paper.
            </p>
          </div>

          <div ref={p4Ref} className="cine-point right">
            <p className="cine-label">04 // THE AUDIT</p>
            <p className="cine-description-top">
              Every login, key split, and decryption attempt is permanently recorded on a decentralized Hyperledger Fabric. Actions cannot be erased, tampered with, or hidden.
            </p>
            <h2>Immutable</h2>
            <h2>Blockchain.</h2>
          </div>

          <div ref={p5Ref} className="cine-point left">
            <p className="cine-label">05 // THE TRACE</p>
            <h2>Steganographic</h2>
            <h2 className="indent">Tracing.</h2>
            <p className="cine-description">
              Even after decryption, invisible digital watermarks embed identity data into the pixels. Any screenshot or physical printed leak can be traced back to the exact source.
            </p>
          </div>

          <nav className="cine-pill-nav">
            <ul>
              <li>Home</li>
              <li>Architecture</li>
              <li>Security</li>
              <li onClick={() => { setAuthRoute('/custodian'); setAuthOpen(true); }}>Authenticate</li>
              <li onClick={() => { setAuthRoute('/admin'); setAuthOpen(true); }}>Admin Panel</li>
            </ul>
          </nav>
        </div>

        {/* INITIAL UI OVERLAYS (Fades out on scroll) */}
        <div className="ui-overlay">
          <nav className="navbar" ref={topNavRef}>
            <div className="logo">
               <img src="/custom-logo.png" alt="Abhedyah Logo" className="nav-logo-img" />
            </div>
          </nav>

          <div ref={heroContentRef} className="hero-content">
            <HackerTitle text="K A V A C H" />
            <p className="subtitle">Protected by Mathematics, Not Just Trust.</p>
            <p className="tagline">The Next Generation Examination Security System</p>
            <div className="scroll-indicator">↓</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
