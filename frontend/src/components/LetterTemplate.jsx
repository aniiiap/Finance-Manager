import React from 'react';
import { useData } from '../context/DataContext';

export default function LetterTemplate({ letter, id = "letter-pdf-template", className = "hidden" }) {
  const dataContext = useData();
  const letterProfile = dataContext?.letterProfile || {};
  const companyInfo = dataContext?.companyInfo || {}; // Fallback for logo

  if (!letter) return null;

  return (
    <div id={id} className={className}>
      <div className="bg-white text-black font-sans relative overflow-hidden" style={{ width: '210mm', height: '296mm', padding: '15mm 15mm', boxSizing: 'border-box' }}>
        
        {/* Header Section */}
        <div className="flex justify-between text-xs font-bold text-blue-900 mb-2">
          <div>GSTIN : {letterProfile?.gstin || '08AAMCC0862F1ZO'}</div>
          <div>!! Shree !!</div>
          <div>Mo. : {letterProfile?.contact_phone || '97849-91147'}</div>
        </div>
        
        <div className="flex items-center mb-2">
          {/* Logo Placeholder */}
          <div className="flex flex-col items-center justify-center w-32 mr-4">
            <div className="w-24 h-24 flex items-center justify-center overflow-hidden">
               {companyInfo?.logo_url ? (
                 <img src={companyInfo.logo_url} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
               ) : (
                 <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
               )}
            </div>
          </div>
          
          {/* Company Title & Details */}
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-extrabold text-blue-800 tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
              {letterProfile?.company_name || <><span className="text-blue-900">CPMR Projects Private Limited</span></>}
            </h1>
            <p className="text-sm font-semibold text-blue-900 mt-1 whitespace-pre-line">
              {letterProfile?.address || '22 Jato Ka Mohalla, Shivnath Pura, NAHARI, Bhilwara-311803'}
            </p>
            <p className="text-sm font-semibold text-blue-900">
              E-mail : {letterProfile?.contact_email || 'cpmrperojectltd1177@gmail.com'}
            </p>
          </div>
        </div>

        {/* Tricolor Line */}
        <div className="w-full h-1 mt-2 mb-4 flex flex-col">
          <div className="h-[2px] bg-orange-500"></div>
          <div className="h-[1px] bg-white"></div>
          <div className="h-[2px] bg-green-600"></div>
        </div>

        {/* Ref and Date */}
        <div className="flex justify-between font-bold text-blue-900 text-sm mb-8 px-2">
          <div>Ref. : {letter.ref_no}</div>
          <div>Date : {letter.letter_date ? new Date(letter.letter_date).toLocaleDateString('en-GB') : ''}</div>
        </div>

        {/* Letter Content & Signature Wrapper */}
        <div className="relative w-full">
          {/* Letter Content */}
          <div className="px-4 text-base leading-relaxed whitespace-pre-wrap break-words quill-content" dangerouslySetInnerHTML={{ __html: letter.content }} style={{ minHeight: '150mm' }}>
          </div>

          {/* Signature positioned at the bottom right of the content */}
          <div className="absolute right-12 text-center" style={{ bottom: '100px', width: '200px' }}>
            {letterProfile?.signature_url && (
              <img src={letterProfile.signature_url} alt="Authorized Signature" className="max-h-24 max-w-full object-contain mx-auto mb-2" crossOrigin="anonymous" />
            )}
            <div className="text-sm font-bold text-blue-900 border-t border-blue-900 pt-1">
              Authorized Signatory
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
