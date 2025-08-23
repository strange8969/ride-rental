import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set up Supabase connection.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Booking {
  id: string;
  name: string;
  contact: string;
  address: string;
  category: string;
  model: string;
  price_per_day: number;
  days?: number; // Made optional to match the updated table structure
  total_price?: number; // Made optional to match the updated table structure
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BookingInsert {
  name: string;
  contact: string;
  address: string;
  category: string;
  model: string;
  price_per_day: number;
  days?: number; // Made optional to match the updated table structure
  total_price?: number; // Made optional to match the updated table structure
  status?: string;
}

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  created_at?: string;
}

// Function to create a contact message in Supabase
export const createContactMessage = async (contactData: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> => {
  console.log('Creating contact message in Supabase using bookings table:', contactData);
  
  // Skip trying to use the contacts table and directly use the bookings table
  // which we know exists and works
  try {
    // Convert contact form data to booking structure
    const bookingData = {
      name: contactData.name,
      contact: contactData.phone || contactData.email,
      address: contactData.message.substring(0, 255), // Truncate if too long
      category: 'Contact Form',
      model: contactData.subject,
      price_per_day: 0,
      status: `CONTACT: ${contactData.email}`
    };
    
    console.log('Saving contact as booking:', bookingData);
    
    const { error } = await supabase
      .from('bookings')
      .insert([bookingData]);
      
    if (error) {
      console.error('Error inserting into bookings table:', error);
      throw new Error(`Failed to save message to bookings table: ${error.message}`);
    }
    
    console.log('Contact message saved successfully as booking!');
  } catch (err: any) {
    console.error('Unexpected error in createContactMessage:', err);
    throw err; // Re-throw to be caught by the component
  }
}