import React from 'react';

export default function LetterTemplate({ letter }) {
  if (!letter) return null;

  return (
    <div id="letter-pdf-template" className="hidden">
      <div className="bg-white text-black font-sans" style={{ width: '210mm', minHeight: '297mm', padding: '15mm 15mm' }}>
        
        {/* Header Section */}
        <div className="flex justify-between text-xs font-bold text-blue-900 mb-2">
          <div>GSTIN : 08AAMCC0862F1ZO</div>
          <div>!! Shree !!</div>
          <div>Mo. : 97849-91147</div>
        </div>
        
        <div className="flex items-center mb-2">
          {/* Logo Placeholder */}
          <div className="flex flex-col items-center justify-center w-32 mr-4">
            <div className="w-16 h-16 border-2 border-red-600 rounded-lg flex items-center justify-center overflow-hidden">
               {/* Replace this src with actual logo later */}
               <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="text-[10px] font-bold text-blue-800 mt-1 uppercase tracking-tighter">CPMR Projects</div>
          </div>
          
          {/* Company Title & Details */}
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-extrabold text-blue-800 tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
              CPMR <span className="text-blue-900">Projects Private Limited</span>
            </h1>
            <p className="text-sm font-semibold text-blue-900 mt-1">
              22 Jato Ka Mohalla, Shivnath Pura, NAHARI, Bhilwara-311803
            </p>
            <p className="text-sm font-semibold text-blue-900">
              E-mail : cpmrperojectltd1177@gmail.com
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

        {/* Letter Content */}
        <div className="px-4 text-base leading-relaxed whitespace-pre-wrap quill-content" dangerouslySetInnerHTML={{ __html: letter.content }} style={{ minHeight: '150mm' }}>
        </div>

        {/* Footer / Signature */}
        <div className="flex justify-end mt-16 px-4">
          <div className="text-center font-bold text-blue-900 flex flex-col items-center">
            <p>For CPMR Projects Private Limited</p>
            <div className="h-16 w-32 border-b-2 border-transparent"></div> {/* Signature Space */}
            <p className="text-sm">Authorised Signatory</p>
          </div>
        </div>

      </div>
    </div>
  );
}
