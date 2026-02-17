'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { formatPhoneDisplay } from '@/lib/utils/phone-validator';

interface PhoneInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
      onChange?.(raw);
    };

    const displayValue = value ? formatPhoneDisplay(value) : '';

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder="(00) 00000-0000"
        maxLength={15}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
