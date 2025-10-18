'use client';

import { useState } from 'react';
import { createTransaction } from '@/lib/api';
import { CORRELATION_ID_HEADER } from '@/lib/correlation';

interface CreatePaymentButtonProps {
  correlationId: string;
  onPaymentCreated?: () => void;
}

interface FormData {
  amount: string;
  currency: string;
  merchantId: string;
  customerId: string;
  description: string;
}

export default function CreatePaymentButton({
  correlationId,
  onPaymentCreated,
}: CreatePaymentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    amount: '',
    currency: 'KWD',
    merchantId: '',
    customerId: '',
    description: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      // validate amount
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount greater than 0');
        setIsSubmitting(false);
        return;
      }

      // validate required fields
      if (!formData.merchantId.trim() || !formData.customerId.trim()) {
        setError('Merchant ID and Customer ID are required');
        setIsSubmitting(false);
        return;
      }

      // create transaction
      const result = await createTransaction(correlationId, {
        amount,
        currency: formData.currency,
        merchantId: formData.merchantId.trim(),
        customerId: formData.customerId.trim(),
        description: formData.description.trim() || undefined,
      });

      if (result) {
        setSuccess(true);
        // reset form
        setFormData({
          amount: '',
          currency: 'KWD',
          merchantId: '',
          customerId: '',
          description: '',
        });

        // close modal after 1.5 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccess(false);
          if (onPaymentCreated) {
            onPaymentCreated();
          }
        }, 1500);
      } else {
        setError('Failed to create transaction. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Error creating transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <>
      <button
        className="button button-primary"
        onClick={() => setIsModalOpen(true)}
      >
        Make Test Payment
      </button>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Test Payment</h2>
              <button
                className="close-button"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && (
              <div className="success-message">
                Payment created successfully!
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="amount">Amount *</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.001"
                  min="0.001"
                  required
                  disabled={isSubmitting}
                  placeholder="0.000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="currency">Currency *</label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                >
                  <option value="KWD">KWD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="merchantId">Merchant ID *</label>
                <input
                  type="text"
                  id="merchantId"
                  name="merchantId"
                  value={formData.merchantId}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  placeholder="merchant_123"
                />
              </div>

              <div className="form-group">
                <label htmlFor="customerId">Customer ID *</label>
                <input
                  type="text"
                  id="customerId"
                  name="customerId"
                  value={formData.customerId}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  placeholder="customer_456"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
