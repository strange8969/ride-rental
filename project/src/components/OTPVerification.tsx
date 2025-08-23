import React, { useState, useRef } from 'react';
import { Shield, Phone, ArrowLeft } from 'lucide-react';

interface OTPVerificationProps {
  phoneNumber: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  phoneNumber,
  onVerificationSuccess,
  onBack
}) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    // Simple demo verification
    if (otp === '123456') {
      onVerificationSuccess();
    } else {
      setError('Invalid code. Use 123456 for demo.');
    }
  };

  const maskPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `+91 ${cleaned.slice(-10, -5)}***${cleaned.slice(-2)}`;
    }
    return phone;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <button
          onClick={onBack}
          className="absolute left-6 top-6 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verify Your Phone</h2>
          <p className="text-gray-300 text-sm">
            We've sent a verification code to
          </p>
          <p className="text-blue-400 font-medium">
            {maskPhoneNumber(phoneNumber)}
          </p>
        </div>

        {/* Demo Notice */}
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">
          <p className="text-yellow-300 text-sm">
            <strong>Demo Mode:</strong> Enter <strong>123456</strong> to verify
          </p>
        </div>
      </div>

      {/* OTP Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            6-Digit Verification Code
          </label>
          <input
            ref={inputRef}
            type="text"
            value={otp}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setOtp(value);
              setError('');
            }}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors text-white text-center text-lg tracking-widest placeholder-gray-400"
            placeholder="000000"
            maxLength={6}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-400 hover:to-blue-500 transition-all duration-200"
          >
            Verify & Continue
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex-1 border border-gray-600 text-gray-300 py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-all duration-200"
          >
            Back
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 text-center">
        <p className="text-gray-400 text-xs">
          Didn't receive the code? Contact support for assistance.
        </p>
        <div className="mt-2 flex items-center justify-center gap-1 text-gray-500">
          <Phone className="h-3 w-3" />
          <span className="text-xs">Demo verification system</span>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
