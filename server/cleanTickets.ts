import { storage } from './storage.js';

async function cleanTickets() {
  console.log('🧹 Starting ticket cleanup...');
  
  try {
    // Get all tickets
    const tickets = await storage.getTickets();
    console.log(`📋 Found ${tickets.length} total tickets`);
    
    // Filter non-pending tickets
    const toDelete = tickets.filter((t: any) => t.status !== 'pending');
    console.log(`🗑️ Will delete ${toDelete.length} non-pending tickets`);
    
    // Delete each one
    for (const ticket of toDelete) {
      console.log(`   Deleting ${ticket.ticketId || ticket.id} (${ticket.status})...`);
      await storage.deleteTicket(ticket.id);
    }
    
    console.log('✅ Cleanup complete!');
    console.log(`📊 Remaining tickets: ${tickets.length - toDelete.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanTickets();
