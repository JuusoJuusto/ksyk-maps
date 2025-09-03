import { useState } from "react";
import { Button } from "@/components/ui/button";
import NavigationModal from "@/components/NavigationModal";

export default function TestNavigation() {
  const [showModal, setShowModal] = useState(false);

  const handleNavigation = (from: string, to: string) => {
    alert(`Navigation test: ${from} to ${to}`);
  };

  return (
    <div className="p-4">
      <Button onClick={() => setShowModal(true)}>
        Test Navigation Modal
      </Button>
      <NavigationModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onNavigate={handleNavigation}
      />
    </div>
  );
}