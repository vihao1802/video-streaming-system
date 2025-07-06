import { Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import VideosList from "./components/VideosList";

export default function Home() {
  return (
    <div className="flex flex-col gap-6 px-4 py-10 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Available Videos</h1>
        <Button asChild className="gap-2">
          <Link href="/upload">
            <Upload className="h-4 w-4" />
            <span>Upload Video</span>
          </Link>
        </Button>
      </div>
      <VideosList />
    </div>
  );
}
