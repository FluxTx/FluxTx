import { Suspense } from "react";
import { PaymentDetailClient } from "./payment-detail-client";

export default function PaymentDetailPage() {
  return (
    <Suspense fallback={<main className="loading-screen" aria-label="Loading payment details" />}>
      <PaymentDetailClient />
    </Suspense>
  );
}
