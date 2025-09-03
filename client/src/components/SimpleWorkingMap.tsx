export default function SimpleWorkingMap() {
  return (
    <div style={{
      width: "100%",
      height: "100vh",
      backgroundColor: "#dbeafe",
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "10px",
        padding: "30px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        maxWidth: "800px",
        margin: "0 auto"
      }}>
        <h1 style={{
          fontSize: "28px",
          fontWeight: "bold",
          color: "#1f2937",
          marginBottom: "8px"
        }}>KSYK Map</h1>
        
        <p style={{
          color: "#6b7280",
          marginBottom: "30px"
        }}>by OLW APPS</p>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "30px"
        }}>
          <button style={{
            backgroundColor: "#9333ea",
            color: "white",
            padding: "20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>M12</div>
            <div style={{ fontSize: "14px" }}>Music Building</div>
          </button>
          
          <button style={{
            backgroundColor: "#dc2626",
            color: "white",
            padding: "20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>K15</div>
            <div style={{ fontSize: "14px" }}>Central Hall</div>
          </button>
          
          <button style={{
            backgroundColor: "#059669",
            color: "white",
            padding: "20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>L01</div>
            <div style={{ fontSize: "14px" }}>Gymnasium</div>
          </button>
          
          <button style={{
            backgroundColor: "#ea580c",
            color: "white",
            padding: "20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>R10</div>
            <div style={{ fontSize: "14px" }}>R Building</div>
          </button>
          
          <button style={{
            backgroundColor: "#2563eb",
            color: "white",
            padding: "20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>A20</div>
            <div style={{ fontSize: "14px" }}>A Building</div>
          </button>
          
          <button style={{
            backgroundColor: "#7c3aed",
            color: "white",
            padding: "20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "16px"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>U30</div>
            <div style={{ fontSize: "14px" }}>U Building</div>
          </button>
        </div>
        
        <div style={{ color: "#6b7280" }}>
          <p>Click any room button to select it</p>
          <p>Campus buildings: M, K, L, R, A, U</p>
        </div>
      </div>
    </div>
  );
}