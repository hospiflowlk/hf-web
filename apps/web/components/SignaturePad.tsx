"use client";

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  onSave: (signatureData: string, tipAmount: number) => void;
  onCancel: () => void;
  orderTotal: number;
}

export function SignaturePad({ onSave, onCancel, orderTotal }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Please provide a signature.");
      return;
    }
    const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (signatureData) {
      onSave(signatureData, 0); // Always pass 0 for tip
    }
  };

  const tipOptions = [
    { label: 'No Tip', value: 0 },
    { label: '10%', value: orderTotal * 0.1 },
    { label: '15%', value: orderTotal * 0.15 },
    { label: '20%', value: orderTotal * 0.2 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-1">Sign & Confirm</h3>
        <p className="text-muted-foreground">Post to Room Charge</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl space-y-4">
        <div className="flex justify-between items-center text-xl pt-2 pb-2">
          <span className="font-bold">Total:</span>
          <span className="font-bold text-green-600">${orderTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-700">Please Sign Below</label>
          <button type="button" onClick={clear} className="text-sm text-red-500 hover:underline">Clear Signature</button>
        </div>
        <div className="border-2 border-gray-300 rounded-xl bg-white overflow-hidden" style={{ touchAction: 'none' }}>
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: 'signature-canvas w-full h-48',
            }}
          />
        </div>
      </div>

      <div className="flex gap-4 mt-4">
        <Button type="button" variant="outline" className="flex-1 h-14 text-lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700" onClick={handleSave}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
