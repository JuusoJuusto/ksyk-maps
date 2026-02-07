import { Ticket } from "lucide-react";

export default function TicketSystem() {
  const handleOpenTickets = () => {
    // Redirect to StudiOWL ticket system with KSYK Maps pre-selected
    window.open('https://studiowl.vercel.app/tickets?app=ksyk-maps', '_blank');
  };

  return (
    <button
      onClick={handleOpenTickets}
      className="fixed bottom-20 right-4 md:bottom-20 md:right-4 z-30 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110"
      title="Submit Support Ticket"
    >
      <Ticket className="h-5 w-5" />
    </button>
  );
}
