import { Suspense } from "react";
import AIStackPage from "@/features/aistack/page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AIStackPage />
    </Suspense>
  );
}
