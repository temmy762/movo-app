import { Suspense } from "react";
import VerifyOtpClient from "./VerifyOtpClient";

export default function AdminVerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm px-8 py-10 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-200 mb-4" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    }>
      <VerifyOtpClient />
    </Suspense>
  );
}
