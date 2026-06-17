import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Scale, FileText, Sprout, Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, initialTab = 'privacy' }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-4xl h-[90vh] md:h-[80vh] rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100 min-h-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 md:px-8 md:py-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center text-primary shadow-inner">
                <Sprout className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="font-serif italic font-black text-lg sm:text-xl tracking-tight text-slate-800">FarmToHome Legal Hub</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Platform Compliance & Data Safety</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all border border-slate-100 hover:rotate-90 active:scale-90 shadow-sm"
              id="close-legal-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-4 px-6 md:px-8 py-3 bg-slate-50/20 border-b border-slate-100/80 shrink-0">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'privacy'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 bg-slate-100/40 md:bg-transparent'
              }`}
              id="tab-privacy-btn"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy Policy</span>
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'terms'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 bg-slate-100/40 md:bg-transparent'
              }`}
              id="tab-terms-btn"
            >
              <Scale className="w-4 h-4" />
              <span>Terms of Service</span>
            </button>
          </div>

          {/* Scrollable Contents Component */}
          <div className="flex-grow overflow-y-auto p-6 md:p-10 font-sans text-slate-600 space-y-8 select-text">
            {activeTab === 'privacy' ? (
              <div className="space-y-6 max-w-3xl">
                <div className="border-b border-slate-100 pb-4">
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight font-serif italic">Privacy Policy</h1>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Last Updated: June 16, 2026</p>
                </div>

                <p className="leading-relaxed text-sm">
                  Welcome to <strong>FarmToHome</strong> (accessible at <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-primary">farmtohomeph.web.app</code>). We are committed to protecting your personal data and ensuring transparency in how we collect, use, and safeguard your data. This Privacy Policy is structured to comply with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> of the Philippines.
                </p>

                {/* Section 1 */}
                <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    1. Information Collection
                  </h3>
                  <p className="text-xs leading-relaxed">
                    To connect local farmers and consumers seamlessly, we collect key personal identifiers. We utilize industry-standard services provided by Google Firebase to store and authenticate this information.
                  </p>
                  <ul className="list-disc pl-5 text-xs space-y-1.5 text-slate-500">
                    <li><strong>Personal Identity Indicators:</strong> Full Name, Profile Photo, and Account Role (Buyer, Farmer, Admin).</li>
                    <li><strong>Contact Information:</strong> Active phone numbers and email addresses for delivery updates.</li>
                    <li><strong>Logistics Details:</strong> Physical delivery addresses, municipality coordinates, and spatial shipping markers.</li>
                    <li><strong>Secret Credentials:</strong> Secured login credentials processed in real-time.</li>
                  </ul>
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    2. Data Usage & Processing
                  </h3>
                  <p className="text-xs leading-relaxed">
                    Your personal information is strictly processed for the execution of trade, shipping coordination, and platform management on <strong>FarmToHome</strong>:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white border border-slate-100 rounded-xl">
                      <span className="text-sm font-serif italic font-bold text-primary">Order Fulfilment</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">We share delivery addresses and contact information with couriers and partner farmers to prepare and dispatch physical deliveries.</p>
                    </div>
                    <div className="p-3 bg-white border border-slate-100 rounded-xl">
                      <span className="text-sm font-serif italic font-bold text-primary">Account Management</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">To personalize user dashboards, enable messaging between buyers and farmers, and trace order statuses as they change.</p>
                    </div>
                    <div className="p-3 bg-white border border-slate-100 rounded-xl">
                      <span className="text-sm font-serif italic font-bold text-primary">Localized Coordination</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">To match geographical locations for logistics optimization, calculating fair transportation and courier costs.</p>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    3. Security & Third-Party Infrastructure
                  </h3>
                  <p className="text-xs leading-relaxed">
                    All stored user information is secured using <strong>Google Firebase Services</strong> (Firebase Authentication, Firestore Database, and Firebase Storage). We do not host independent server databases or share database credentials outside this scope. No localized payment details are cached directly on our application.
                  </p>
                  <p className="text-[11px] leading-relaxed italic text-slate-400">
                    *Note: By using this service, you acknowledge that your metadata passes through Google’s secure, global cloud architectures as highlighted in Google Cloud's safety agreements.
                  </p>
                </div>

                {/* Section 4 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    4. Your Rights as a Data Subject
                  </h3>
                  <p className="text-xs leading-relaxed">
                    Under the Data Privacy Act of 2012, both buyers and registered farmers enjoy complete freedom over their records:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex gap-2.5 items-start">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs"><strong>Review & Edit Profiles:</strong> You can completely modify your name, profile parameters, delivery context, and contact details from your dashboard profile at any time.</p>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs"><strong>Request Deletion:</strong> You can wipe your entire user profile record from our platform by requesting account purging, which deletes both your Firebase Authentication and database files.</p>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="pt-6 border-t border-slate-100 text-center">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Questions about privacy? Contact us at</p>
                  <p className="text-xs text-primary font-serif italic mt-1">farmtohomee11@gmail.com • 09193604094</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl">
                <div className="border-b border-slate-100 pb-4">
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight font-serif italic">Terms of Service</h1>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Last Updated: June 16, 2026</p>
                </div>

                <p className="leading-relaxed text-sm">
                  Welcome to <strong>FarmToHome</strong>. These Terms of Service regulate your interaction with our marketplace platform. Please read these regulations thoroughly before registering an account. By visiting, purchasing, or listing products on our website (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-primary font-mono">farmtohomeph.web.app</code>), you agree to comply with these terms.
                </p>

                {/* Section 1 */}
                <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    1. User Registration & Account Responsibility
                  </h3>
                  <p className="text-xs leading-relaxed">
                    By registering an account with <strong>FarmToHome</strong>, you assume ultimate coverage for login details:
                  </p>
                  <ul className="list-disc pl-5 text-xs space-y-1.5 text-slate-500">
                    <li><strong>Credential Security:</strong> You are responsible for preserving password secrecy and restricting unauthorized local entry.</li>
                    <li><strong>Profile Verity:</strong> You agree to represent correct personal names, active contact numbers, and legitimate delivery endpoints.</li>
                    <li><strong>Age Eligibility:</strong> By utilizing this service, you declare that you possess full legal liability to bind and conduct local e-commerce transactions.</li>
                  </ul>
                </div>

                {/* Section 2 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    2. Acceptable Use & Marketplace Safety
                  </h3>
                  <p className="text-xs leading-relaxed">
                    To maintain fair, direct-to-farm market transparency, you are bound by rigorous compliance parameters:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-2">
                      <span className="text-xs font-black uppercase text-secondary tracking-wider block">🚫 Prohibited Farm Practices</span>
                      <ul className="list-disc pl-4 text-[10px] text-slate-400 space-y-1">
                        <li>Listing fraudulent crop weights, incorrect pricing, or stale imagery.</li>
                        <li>Claiming unverified organic certifications or GAP certificates.</li>
                        <li>Artificially bloating prices or violating local fair trade policies.</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-2">
                      <span className="text-xs font-black uppercase text-secondary tracking-wider block">🚫 Prohibited Buyer Practices</span>
                      <ul className="list-disc pl-4 text-[10px] text-slate-400 space-y-1">
                        <li>Creating duplicate, malicious, or fraudulent bulk reservations.</li>
                        <li>Unfairly cancelling active physical courier dispatches.</li>
                        <li>Using offensive language when speaking with farmers.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    3. Limitation of Liability
                  </h3>
                  <p className="text-xs leading-relaxed">
                    <strong>FarmToHome</strong> functions as a secure digital bridge to connect community buyers and agricultural farmers directly. By registering, you understand and acknowledge:
                  </p>
                  <ul className="list-disc pl-5 text-xs space-y-1.5 text-slate-400">
                    <li><strong>Transit Delays:</strong> Weather conditions, localized shipping interruptions, and remote provincial roadblocks are outside our direct logistics sphere.</li>
                    <li><strong>Crop Seasonality:</strong> Fresh, organic harvests are naturally susceptible to differences in aesthetics and visual presentation compared to digitized illustrations.</li>
                    <li><strong>No Financial Indemnification:</strong> The platform handles infrastructure security in good faith using Google services, and is not liable for indirect or accidental system interruptions.</li>
                  </ul>
                </div>

                {/* Section 4 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-primary rounded-full" />
                    4. Governing Law & Dispute Resolution
                  </h3>
                  <p className="text-xs leading-relaxed">
                    These Terms of Service are bound and interpreted under the legislation of the <strong>Republic of the Philippines</strong>. Any dispute, localized transaction audit, or compliance discrepancy shall map directly to designated judicial agencies in accordance with local e-commerce laws.
                  </p>
                </div>

                {/* Footer Section */}
                <div className="pt-6 border-t border-slate-100 text-center">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Questions about terms? Contact us at</p>
                  <p className="text-xs text-primary font-serif italic mt-1">farmtohomee11@gmail.com • 09193604094</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="px-6 py-4 md:px-8 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">FarmToHome Trust Shield Protocols</span>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 text-white rounded-full text-[10px] font-semibold uppercase tracking-wider hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center gap-1.5"
              id="confirm-legal-modal-btn"
            >
              <span>Acknowledge</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
