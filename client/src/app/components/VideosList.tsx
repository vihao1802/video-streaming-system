"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SERVER_URL } from "@/app/config";

interface Video {
  id: string;
  title: string;
  description: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

const VideosList = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${SERVER_URL}/videos/`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch videos");
        }

        const data = await response.json();
        
        if (data.success && data.data.videos) {
          setVideos(data.data.videos);
        } else {
          setError("No videos found");
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError(err instanceof Error ? err.message : "Failed to load videos");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Videos</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Videos Yet</h2>
          <p className="text-gray-600 mb-6">
            Upload your first video to get started!
          </p>
          <Link
            href="/upload"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Video
          </Link>
        </div>
      </div>
    );
  }

  console.log(videos);
  

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => {

        console.log(`${SERVER_URL}/videos/${video.id}/thumbnail`);
        

        return   <div
          key={video.id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
        >
          <div className="bg-gray-200 h-48 relative overflow-hidden">
            <img
              src={`${SERVER_URL}/videos/${video.id}/thumbnail`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if thumbnail fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full"><span class="text-gray-500">No Thumbnail</span></div>';
              }}
            />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
              {video.title}
            </h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {video.description}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <span
                className={`px-2 py-1 rounded-full ${
                  video.processing_status === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {video.processing_status}
              </span>
              <span>{new Date(video.created_at).toLocaleDateString()}</span>
            </div>
            <Link
              href={`/watch/${video.id}`}
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Watch Now
            </Link>
          </div>
        </div>
      })}
    </div>
  );
};

export default VideosList;
