"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { VideoPlayer } from "@/components";
import { SERVER_URL } from "@/app/config";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

const WatchPage = () => {
  const params = useParams();
  const video_id = params?.video_id as string;

  const [videoData, setVideoData] = useState<VideoMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!video_id) return;

    const fetchVideoData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${SERVER_URL}/videos/${video_id}`);

        if (!response.ok) {
          throw new Error("Video not found");
        }

        const data = await response.json();

        if (data.success && data.data) {
          setVideoData(data.data);

          // Check if video is still processing
          if (data.data.processing_status !== "COMPLETED") {
            setError("Video is still processing. Please check back later.");
          }
        } else {
          setError("Failed to load video data");
        }
      } catch (err) {
        console.error("Error fetching video:", err);
        setError(err instanceof Error ? err.message : "Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
  }, [video_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <svg
            className="w-24 h-24 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">
            {error || "Video not found"}
          </h1>
          <p className="text-gray-400 mb-6">
            The video you&apos;re looking for doesn&apos;t exist or is
            unavailable.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const manifestUrl = `${SERVER_URL}/videos/${video_id}/manifest`;
  const formattedDate = new Date(videoData.created_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button asChild className="self-start mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </Button>

        {/* Video Player Section */}
        <div className="mb-6">
          <VideoPlayer
            manifestUrl={manifestUrl}
            title={videoData.title}
            autoplay={false}
          />
        </div>

        {/* Video Information Section */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-6 border border-gray-700">
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4">
            {videoData.title}
          </h1>

          {/* Metadata Row */}
          <div className="flex items-center gap-6 text-gray-300 text-sm mb-6">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  videoData.processing_status === "COMPLETED"
                    ? "bg-green-500"
                    : videoData.processing_status === "IN_PROGRESS"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <span className="capitalize">
                {videoData.processing_status.replace("_", " ").toLowerCase()}
              </span>
            </div>
          </div>

          {/* Description Section */}
          <div className="border-t border-gray-700 pt-4">
            <h2 className="text-lg font-semibold text-white mb-2">
              Description
            </h2>
            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {videoData.description || "No description available."}
            </p>
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Details Card */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-red-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M21 3H3c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.11-.9-2-2-2zm0 14H3V5h18v12z" />
              </svg>
              Video Details
            </h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-400">Video ID:</span>
                <span className="font-mono text-sm">{videoData.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Format:</span>
                <span>MPEG-DASH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quality:</span>
                <span>Adaptive (360p - 1080p)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Audio:</span>
                <span>AAC 128kbps</span>
              </div>
            </div>
          </div>

          {/* Streaming Info Card */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-blue-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Streaming Technology
            </h3>
            <div className="space-y-3 text-gray-300">
              <div>
                <p className="text-sm text-gray-400 mb-1">
                  Adaptive Bitrate Streaming
                </p>
                <p className="text-sm">
                  Automatically adjusts quality based on your connection speed
                  for the best viewing experience.
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">
                  Multiple Resolutions
                </p>
                <p className="text-sm">
                  Choose from 360p, 720p, and 1080p or let the player decide
                  automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
