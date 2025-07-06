"use client";

import UploadForm from "@/app/components/UploadForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const UploadPage = () => {
  return (
    <div className="flex flex-col gap-2 px-4 py-6 max-w-2xl mx-auto w-full">
      <Button asChild className="self-start">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </Button>
      <UploadForm />
    </div>
  );
};

export default UploadPage;
