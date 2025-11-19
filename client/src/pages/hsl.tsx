import { useEffect } from "react";

export default function HSL() {
  useEffect(() => {
    // Set page title
    document.title = "Ksyk HSL Näyttö";
    
    // Apply full-screen styles
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.background = "black";
    
    // Cleanup on unmount
    return () => {
      document.body.style.margin = "";
      document.body.style.padding = "";
      document.body.style.height = "";
      document.body.style.overflow = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div style={{ 
      position: "fixed", 
      top: 0, 
      left: 0, 
      width: "100%", 
      height: "100%", 
      background: "black" 
    }}>
      <iframe
        src="https://omatnaytot.hsl.fi/static?url=501f6d3a-2a43-5958-b3fc-a169c7521878"
        style={{
          width: "100%",
          height: "100%",
          border: "none"
        }}
        allowFullScreen
        title="HSL Näyttö"
      />
      {/* Transparent overlay that hides login/edit button */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
          background: "transparent",
          pointerEvents: "all"
        }}
      />
    </div>
  );
}