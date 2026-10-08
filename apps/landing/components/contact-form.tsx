'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error && result.error !== 'Contact delivery is temporarily unavailable.' ? result.error : 'Unable to submit your request right now. Please try again later.');
      }
      setStatus('success');
      setMessage('Rahmat! Xabaringiz jo’natildi.');
      event.currentTarget.reset();
    } catch (error) {
      setStatus('error');
      setMessage('Unable to submit your request right now. Please try again later.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Ism</Label>
          <Input id="name" name="name" required autoComplete="name" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="email">Elektron pochta</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="telegram">Telegram hisobingiz</Label>
          <Input id="telegram" name="telegram" autoComplete="username" className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" className="mt-1.5" />
        </div>
      </div>
      <div>
        <Label htmlFor="message">Xabaringiz</Label>
        <Textarea id="message" name="message" required maxLength={2000} className="mt-1.5 min-h-[120px]" />
      </div>
      <Button type="submit" disabled={status === 'submitting'} className="w-full">
        {status === 'submitting' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        {status === 'submitting' ? 'Yuborilmoqda...' : 'Yuborish'}
      </Button>
      {status === 'success' ? (
        <p role="status" className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> {message}
        </p>
      ) : null}
      {status === 'error' ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {message}
        </p>
      ) : null}
    </form>
  );
}
