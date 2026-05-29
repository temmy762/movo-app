import { Suspense } from "react";
import AuthSelectClient from "./AuthSelectClient";

export default function AuthSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 mb-4" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    }>
      <AuthSelectClient />
    </Suspense>
  );
}
