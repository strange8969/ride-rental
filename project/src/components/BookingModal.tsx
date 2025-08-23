import React, { useState, useEffect, useRef } from 'react';
import { X, User, Phone, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { supabase, type BookingInsert } from '../lib/supabase';

interface BookingData {
  category: string;
  model: string;
  pricePerDay: number;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingData | null;
}

interface FormData {
  name: string;
  contact: string;
  address: string;
  days: number;
}

interface FormErrors {
  name?: string;
  contact?: string;
  address?: string;
  days?: string;
}

type BookingStep = 'form' | 'thank-you';

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, bookingData }) => {
  const [currentStep, setCurrentStep] = useState<BookingStep>('form');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    contact: '',
    address: '',
    days: 1
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus management and escape key handling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('form');
      setFormData({ name: '', contact: '', address: '', days: 1 });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation: 2-60 chars, letters and spaces only
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 60) {
      newErrors.name = 'Name must be less than 60 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters and spaces';
    }

    // Contact validation: 10 digits or +91 + 10 digits
    const contactClean = formData.contact.replace(/\s+/g, '');
    if (!contactClean) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^(\+91)?[6-9]\d{9}$/.test(contactClean)) {
      newErrors.contact = 'Enter a valid 10-digit Indian mobile number';
    }

    // Address validation: minimum 10 characters
    if (!formData.address.trim()) {
      newErrors.address = 'Pickup address is required';
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
    }

    // Days validation: must be a positive number between 1 and 30
    if (!formData.days || formData.days < 1) {
      newErrors.days = 'Number of days must be at least 1';
    } else if (formData.days > 30) {
      newErrors.days = 'Maximum rental period is 30 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitToSupabase = async (payload: BookingInsert): Promise<boolean> => {
    try {
      console.log('Connecting to Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Full payload being sent to Supabase:', payload);

      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.error('Missing Supabase environment variables');
        throw new Error('Missing Supabase environment variables. Check your .env file.');
      }

      const bookingPayload: any = {
        name: payload.name,
        contact: payload.contact,
        address: payload.address,
        category: payload.category,
        model: payload.model,
        price_per_day: payload.price_per_day,
        status: payload.status || 'pending'
      };

      if (payload.days !== undefined) {
        bookingPayload.days = payload.days;
      }
      
      if (payload.total_price !== undefined) {
        bookingPayload.total_price = payload.total_price;
      }

      console.log('Supabase client initialized with URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Submitting booking payload:', bookingPayload);

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingPayload])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        return false;
      }

      console.log('Booking saved successfully:', data);
      return true;
    } catch (error) {
      console.error('Error submitting to Supabase:', error);
      return false;
    }
  };

  const submitToGoogleForm = async (payload: any): Promise<boolean> => {
    try {
      await fetch('https://script.google.com/macros/s/AKfycbxJQsVLGK7qgJ1bm9Ag0AEBL09pHf06vpjV7ZjnFYdNKM8y9HUhlQAnXwwG4gM-OCSs/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      return true;
    } catch (error) {
      console.error('Error submitting to Google Form:', error);
      return false;
    }
  };

  const calculatePrice = () => {
    if (!bookingData) return { pricePerDay: 0, totalPrice: 0, discount: false };
    
    let pricePerDay = bookingData.pricePerDay;
    let totalPrice = pricePerDay * formData.days;
    let discount = false;
    
    // Apply 10% discount for Pulsar bikes when booked for exactly 24 hours (1 day)
    if (formData.days === 1 && 
        (bookingData.model.includes('Pulsar 150') || 
         bookingData.model.includes('Pulsar 125'))) {
      discount = true;
      totalPrice = Math.round(totalPrice * 0.9); // 10% off
    }
    
    return { pricePerDay, totalPrice, discount };
  };

  const storeBookingLocally = (payload: any) => {
    try {
      const existingBookings = JSON.parse(localStorage.getItem('pendingBookings') || '[]');
      
      const bookingWithTimestamp = {
        ...payload,
        savedAt: new Date().toISOString(),
        id: `local-${Date.now()}`
      };
      
      existingBookings.push(bookingWithTimestamp);
      localStorage.setItem('pendingBookings', JSON.stringify(existingBookings));
      
      console.log('Booking saved to localStorage as fallback');
      return true;
    } catch (err) {
      console.error('Failed to save booking to localStorage:', err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !bookingData) return;

    // Directly submit the booking
    await submitBooking();
  };

  const submitBooking = async () => {
    if (!bookingData) return;
    
    setIsSubmitting(true);
    
    const { pricePerDay, totalPrice } = calculatePrice();

    const supabasePayload: BookingInsert = {
      name: formData.name.trim(),
      contact: formData.contact.replace(/\s+/g, ''),
      address: formData.address.trim(),
      category: bookingData.category,
      model: bookingData.model,
      price_per_day: pricePerDay,
      days: formData.days,
      total_price: totalPrice,
      status: 'pending'
    };

    const commonPayload = {
      name: formData.name.trim(),
      contact: formData.contact.replace(/\s+/g, ''),
      address: formData.address.trim(),
      category: bookingData.category,
      model: bookingData.model,
      pricePerDay: pricePerDay,
      days: formData.days,
      totalPrice: totalPrice,
      timestamp: new Date().toISOString()
    };

    console.log('Booking Payload:', supabasePayload);
    let successfulSubmission = false;
    
    try {
      console.log('Attempting to submit booking to Supabase...');
      const supabaseSuccess = await submitToSupabase(supabasePayload);
      
      if (supabaseSuccess) {
        console.log('✅ Booking submitted to Supabase successfully!');
        successfulSubmission = true;
      } else {
        console.log('❌ Supabase submission failed, trying Google Form as fallback...');
        const googleFormSuccess = await submitToGoogleForm(commonPayload);
        
        if (googleFormSuccess) {
          console.log('✅ Booking submitted to Google Form successfully!');
          successfulSubmission = true;
        } else {
          console.log('❌ Google Form submission failed, saving to localStorage...');
          const localStorageSuccess = storeBookingLocally(commonPayload);
          
          if (localStorageSuccess) {
            console.log('✅ Booking saved to localStorage successfully!');
            successfulSubmission = true;
          }
        }
      }
      
      if (successfulSubmission) {
        setCurrentStep('thank-you');
      } else {
        console.error('❌ All submission methods failed!');
        alert('There was an error submitting your booking. Please contact us directly with your booking details.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      
      const localStorageSuccess = storeBookingLocally(commonPayload);
      
      if (localStorageSuccess) {
        setCurrentStep('thank-you');
        console.log('✅ Saved to localStorage after error!');
      } else {
        alert('There was an error submitting your booking. Please try again or contact us directly.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const processedValue = field === 'days' ? parseInt(value) || 1 : value;
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen || !bookingData) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div 
        ref={modalRef}
        className={`
          relative w-full max-w-md bg-gray-800 rounded-xl shadow-2xl transform transition-all duration-300 ease-out border border-gray-700
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
          md:max-w-lg lg:max-w-xl
          max-h-[90vh] overflow-y-auto
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {currentStep === 'thank-you' ? (
          /* Thank You State */
          <div className="p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Thanks, {formData.name.split(' ')[0]}!
              </h2>
              <p className="text-gray-300">
                We'll contact you shortly to confirm your <strong>{bookingData.model}</strong> booking for <strong>{formData.days} {formData.days > 1 ? 'days' : 'day'}</strong>.
                {calculatePrice().discount && formData.days === 1 && (
                  <span className="block mt-1 text-green-400 font-medium">With 10% discount applied!</span>
                )}
              </p>
            </div>
            
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-300">
                <strong>What's next?</strong><br />
                Our team will call you within 30 minutes to confirm availability and arrange pickup details.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3 px-6 rounded-lg font-semibold hover:from-yellow-300 hover:to-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 shadow-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-600">
              <h2 id="booking-modal-title" className="text-2xl font-bold text-white mb-2">
                Complete Your Booking
              </h2>
              <p className="text-gray-300">
                Fill in your details to complete the booking.
              </p>
            </div>

            {/* Booking Summary */}
            <div className="p-6 py-4 bg-gray-700 border-b border-gray-600">
              <h3 className="font-semibold text-white mb-2">Booking Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Category:</span>
                  <span className="font-medium text-white">{bookingData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Model:</span>
                  <span className="font-medium text-white">{bookingData.model}</span>
                </div>
                
                {calculatePrice().discount && formData.days === 1 ? (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Price per day:</span>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 line-through">₹{bookingData.pricePerDay}</span>
                        <span className="font-medium text-yellow-400">₹{Math.round(bookingData.pricePerDay * 0.9)}</span>
                      </div>
                      <div className="text-xs text-green-400 font-semibold">10% OFF APPLIED!</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Price per day:</span>
                    <span className="font-medium text-yellow-400">₹{bookingData.pricePerDay}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-1 border-t border-gray-600 mt-1">
                  <span className="text-gray-300">Total:</span>
                  <div className="text-right">
                    {calculatePrice().discount && formData.days === 1 ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 line-through text-sm">₹{bookingData.pricePerDay * formData.days}</span>
                          <span className="font-medium text-yellow-400 text-lg">₹{calculatePrice().totalPrice}</span>
                        </div>
                        <div className="text-xs text-green-400">You save ₹{bookingData.pricePerDay * formData.days - calculatePrice().totalPrice}!</div>
                      </>
                    ) : (
                      <span className="font-medium text-yellow-400 text-lg">₹{calculatePrice().totalPrice}</span>
                    )}
                    <div className="text-xs text-gray-400">for {formData.days} {formData.days > 1 ? 'days' : 'day'}</div>
                  </div>
                </div>
                
                {bookingData.model.includes("Pulsar") && formData.days !== 1 && (
                  <div className="mt-2 py-2 px-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    <p className="text-xs text-yellow-200 font-medium">💡 Tip: Book for exactly 24 hours to get 10% OFF on this Pulsar!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      ref={firstInputRef}
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`
                        w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors text-white placeholder-gray-400
                        ${errors.name ? 'border-red-500' : 'border-gray-600'}
                      `}
                      placeholder="Enter your full name"
                      disabled={isSubmitting}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                  </div>
                  {errors.name && (
                    <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Contact Number */}
                <div>
                  <label htmlFor="contact" className="block text-sm font-medium text-gray-300 mb-1">
                    Contact Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      id="contact"
                      type="tel"
                      value={formData.contact}
                      onChange={(e) => handleInputChange('contact', e.target.value)}
                      className={`
                        w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors text-white placeholder-gray-400
                        ${errors.contact ? 'border-red-500' : 'border-gray-600'}
                      `}
                      placeholder="+91 98765 43210"
                      disabled={isSubmitting}
                      aria-describedby={errors.contact ? 'contact-error' : undefined}
                    />
                  </div>
                  {errors.contact && (
                    <p id="contact-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.contact}
                    </p>
                  )}
                </div>

                {/* Pickup Address */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">
                    Pickup Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                    <textarea
                      id="address"
                      rows={3}
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className={`
                        w-full pl-10 pr-4 py-3 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors resize-none text-white placeholder-gray-400
                        ${errors.address ? 'border-red-500' : 'border-gray-600'}
                      `}
                      placeholder="Enter your complete pickup address..."
                      disabled={isSubmitting}
                      aria-describedby={errors.address ? 'address-error' : undefined}
                    />
                  </div>
                  {errors.address && (
                    <p id="address-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.address}
                    </p>
                  )}
                </div>
                
                {/* Booking Days */}
                <div>
                  <label htmlFor="days" className="block text-sm font-medium text-gray-300 mb-1">
                    Number of Days *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        id="days"
                        type="number"
                        min="1"
                        max="30"
                        value={formData.days}
                        onChange={(e) => handleInputChange('days', e.target.value)}
                        className={`
                          w-full px-4 py-3 bg-gray-700 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors text-white placeholder-gray-400
                          ${errors.days ? 'border-red-500' : 'border-gray-600'}
                        `}
                        disabled={isSubmitting}
                        aria-describedby={errors.days ? 'days-error' : undefined}
                      />
                    </div>
                    <div className="text-yellow-400 font-medium">
                      ₹{calculatePrice().totalPrice} total
                    </div>
                  </div>
                  {errors.days && (
                    <p id="days-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.days}
                    </p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black py-3 px-6 rounded-lg font-semibold hover:from-yellow-300 hover:to-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Booking'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none sm:px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
