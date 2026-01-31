import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareModalProps {
  petName: string;
  shareUrl: string;
  onClose: () => void;
  onManageLinks: () => void;
}

export default function ShareModal({ petName, shareUrl, onClose, onManageLinks }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Share {petName}'s Card</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="text-center">
          <div className="bg-white p-4 inline-block rounded-lg border mb-4">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Scan this QR code or share the link below to give ER staff instant access to {petName}'s health information.
          </p>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="input flex-1 text-sm"
            />
            <button
              onClick={handleCopy}
              className="btn-primary whitespace-nowrap"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            This link provides read-only access. No login required.
          </p>

          <button
            onClick={onManageLinks}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            Create time-limited or PIN-protected link →
          </button>
        </div>
      </div>
    </div>
  );
}
