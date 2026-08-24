import React, { useState, useEffect, useRef } from 'react';
import './TerminalProcess.css';

const steps = [
  {
    id: 'A',
    title: 'THE FORGE (QUESTION BANK)',
    command: '> [INIT] PROTOCOL A: Encrypting Questions...\n> AI Agent: Similarity scan initiated...\n> Analysis: 0% Duplicates Found.\n> Result: SECURE. No individual possesses full access.',
    visual: 'forge'
  },
  {
    id: 'B',
    title: 'THE LOCK (PAPER CREATION)',
    command: "> [INIT] PROTOCOL B: Assembling final payload...\n> Hash generated: 0x8F9B2...\n> Applying AES-256-GCM Encryption...\n> Splitting Master Key (Shamir's Secret Sharing)...\n> Distributing 7 shares to independent nodes.",
    visual: 'keysplit'
  },
  {
    id: 'C',
    title: 'THE GATES (DOUBLE-UNLOCK)',
    command: '> [INIT] PROTOCOL C: Monitoring conditions...\n> Gate 1 [TIME]: T-Minus 5 minutes to exam...\n> Gate 2 [QUORUM]: Waiting for 4 of 7 signatures...\n> WARNING: Access Denied until both conditions met.',
    visual: 'doublegate'
  },
  {
    id: 'D',
    title: 'THE PAYLOAD (DELIVERY)',
    command: '> [INIT] PROTOCOL D: Conditions Met. Unlock Authorized.\n> Routing to Just-In-Time Printers & CBT terminals.\n> Decrypting payload strictly in volatile memory...\n> Key purged from RAM. Paper generated.',
    visual: 'delivery'
  },
  {
    id: 'E',
    title: 'THE TRACE (WATERMARKING)',
    command: '> [INIT] PROTOCOL E: Applying Steganographic Layer...\n> Embedding Centre ID, Timestamp, Node Hash...\n> Injecting invisible watermark into pixels.\n> Status: Leak-trace capability ACTIVE.',
    visual: 'watermark'
  },
  {
    id: 'F',
    title: 'THE LEDGER (POST-EXAM)',
    command: '> [INIT] PROTOCOL F: Chain of Custody Audit...\n> Scanning OMR sheets / CBT responses...\n> Generating immutable SHA-256 digital hash...\n> Committed to Hyperledger Fabric. Audit Complete.',
    visual: 'blockchain'
  }
];

function TypewriterText({ text, speed = 30, onComplete }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    let interval = setInterval(() => {
      setDisplayed(text.substring(0, i));
      i++;
      if (i > text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return <div className="typewriter">{displayed}<span className="cursor">_</span></div>;
}

export default function TerminalProcess() {
  const [activeStep, setActiveStep] = useState(0);
  const [key, setKey] = useState(0);
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const uiContainerRef = useRef(null);
  const overlayRef = useRef(null);
  const logoRef = useRef(null);
  const imagesRef = useRef([]);
  const targetFrameRef = useRef(0);
  const currentFrameRef = useRef(0);
  const lastDrawnFrameRef = useRef(-1);

  const TOTAL_FRAMES = 211;

  useEffect(() => {
    // Preload images
    const images = [];
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(3, '0');
      img.src = `/middle_frames/frame_${frameNum}.jpg`;
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
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate fraction of scroll WITHIN this component
      // Container height is e.g. 300vh, sticky block is 100vh.
      // So scrollable distance is rect.height - window.innerHeight
      const scrollableDistance = rect.height - window.innerHeight;
      
      // How far have we scrolled past the top of the container?
      // When rect.top == 0, we are at the start of the sticky section.
      // When rect.top == -scrollableDistance, we are at the end.
      let fraction = 0;
      if (rect.top <= 0) {
         fraction = Math.min(1, Math.max(0, Math.abs(rect.top) / scrollableDistance));
      }
      
      targetFrameRef.current = Math.min(TOTAL_FRAMES - 1, fraction * (TOTAL_FRAMES - 1));

      // Update UI visibility and active step based on scroll
      // Dragon fire starts around frame 126-137 (fraction ~0.60)
      const FIRE_THRESHOLD = 0.60;
      
      if (rect.top <= 0 && rect.bottom >= window.innerHeight) {
        if (fraction > FIRE_THRESHOLD) {
          // Show UI and Overlay
          if (uiContainerRef.current && !uiContainerRef.current.classList.contains('visible')) {
            uiContainerRef.current.classList.add('visible');
          }
          if (overlayRef.current && !overlayRef.current.classList.contains('visible')) {
            overlayRef.current.classList.add('visible');
          }
          if (logoRef.current && !logoRef.current.classList.contains('visible')) {
            logoRef.current.classList.add('visible');
          }
          
          // Map steps only for the remaining scroll space (0.60 to 1.0)
          let uiFraction = (fraction - FIRE_THRESHOLD) / (1 - FIRE_THRESHOLD);
          uiFraction = Math.min(1, Math.max(0, uiFraction));
          const newStep = Math.min(5, Math.floor(uiFraction * steps.length));
          
          if (newStep !== activeStepRef.current) {
            setActiveStep(newStep);
            setKey(prev => prev + 1);
          }
        } else {
          // Hide UI and Overlay
          if (uiContainerRef.current && uiContainerRef.current.classList.contains('visible')) {
            uiContainerRef.current.classList.remove('visible');
          }
          if (overlayRef.current && overlayRef.current.classList.contains('visible')) {
            overlayRef.current.classList.remove('visible');
          }
          if (logoRef.current && logoRef.current.classList.contains('visible')) {
            logoRef.current.classList.remove('visible');
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    const renderFrame = (frameIndex) => {
        let img = imagesRef.current[frameIndex];
        
        if (img && img.complete && img.naturalWidth > 0) {
           const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
           const zoomScale = baseScale * 1.05; // slight zoom to prevent edge bleeding
           const x = (canvas.width / 2) - (img.width / 2) * zoomScale;
           const y = (canvas.height / 2) - (img.height / 2) * zoomScale;
           
           ctx.clearRect(0, 0, canvas.width, canvas.height);
           ctx.drawImage(img, x, y, img.width * zoomScale, img.height * zoomScale);
           lastDrawnFrameRef.current = frameIndex;
        }
    }

    const tick = () => {
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
  }, []); // Empty dependency array, using refs for mutable values

  const activeStepRef = useRef(activeStep);
  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  // Handle step click (manual override, though scroll will take over again immediately if they scroll)
  const handleStepClick = (index) => {
    if (index !== activeStep) {
      setActiveStep(index);
      setKey(prev => prev + 1);
    }
  };

  const renderVisual = (type) => {
    switch (type) {
      case 'forge':
        return (
          <div className="vis-forge vis-enter">
             <div className="forge-box">
                <div className="forge-line"></div>
                <div className="forge-line"></div>
                <div className="forge-line"></div>
             </div>
             <div className="forge-scan"></div>
          </div>
        );
      case 'keysplit':
        return (
          <div className="vis-keysplit vis-enter">
             <div className="master-key">MASTER</div>
             <div className="share-lines">
               {[1,2,3,4,5].map(i => <div key={i} className={`share-line sl-${i}`}></div>)}
             </div>
             <div className="shares">
               {[1,2,3,4,5].map(i => <div key={i} className="share-node"></div>)}
             </div>
          </div>
        );
      case 'doublegate':
        return (
          <div className="vis-doublegate vis-enter">
             <div className="gate-time">TIME<br/>T-0</div>
             <div className="gate-beam gb-1"></div>
             <div className="gate-lock">LOCK</div>
             <div className="gate-beam gb-2"></div>
             <div className="gate-quorum">QUORUM<br/>4/7</div>
          </div>
        );
      case 'delivery':
        return (
          <div className="vis-delivery vis-enter">
             <div className="delivery-server"></div>
             <div className="delivery-path">
                <div className="packet"></div>
             </div>
             <div className="delivery-endpoints">
               <div className="ep cbt">CBT</div>
               <div className="ep jitp">JITP</div>
             </div>
          </div>
        );
      case 'watermark':
        return (
          <div className="vis-watermark vis-enter">
            <div className="wm-doc">
              <div className="wm-text"></div>
              <div className="wm-text"></div>
              <div className="wm-hidden">ID: AX-99</div>
            </div>
            <div className="wm-laser"></div>
          </div>
        );
      case 'blockchain':
        return (
          <div className="vis-blockchain vis-enter">
            {[1,2,3,4].map(i => (
              <div key={i} className={`bc-node bc-${i}`}>
                <div className="bc-hex"></div>
              </div>
            ))}
            <div className="bc-link bcl-1"></div>
            <div className="bc-link bcl-2"></div>
            <div className="bc-link bcl-3"></div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="tp-scroll-container" ref={containerRef}>
      <div className="tp-sticky-scene">
        <canvas ref={canvasRef} className="tp-video-canvas"></canvas>
        <div className="tp-overlay" ref={overlayRef}></div>
        <img src="/abhedyah-logo.png" alt="Logo" className="tp-corner-logo" ref={logoRef} />
        
        <div className="terminal-process-container" ref={uiContainerRef}>
          <div className="tp-header">
            <h2 className="tp-title">KAVACH SYSTEM PROTOCOL</h2>
            <p className="tp-subtitle">Interactive Step-by-Step Execution Sequence</p>
          </div>

          <div className="tp-grid">
            <div className="tp-nav">
              {steps.map((step, index) => (
                <button 
                  key={step.id} 
                  className={`tp-nav-btn ${index === activeStep ? 'active' : ''}`}
                  onClick={() => handleStepClick(index)}
                >
                  <span className="step-id">[{step.id}]</span> {step.title}
                </button>
              ))}
            </div>

            <div className="tp-terminal">
              <div className="term-header">
                <span>root@kavach-core:~# protocol_execute --step {steps[activeStep].id}</span>
              </div>
              <div className="term-body">
                <TypewriterText key={key} text={steps[activeStep].command} speed={30} />
              </div>
            </div>

            <div className="tp-visualizer">
              <div className="vis-header">LIVE TELEMETRY</div>
              <div className="vis-body" key={`vis-${key}`}>
                {renderVisual(steps[activeStep].visual)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
