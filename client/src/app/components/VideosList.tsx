"use client";

import Link from "next/link";

const fakeVideos = [
  {
    id: "abc",
    title: "Video 1",
    description: "Description 1",
    processing_status: "IN_PROGRESS",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "def",
    title: "Video 2",
    description: "Description 2",
    processing_status: "COMPLETED",
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "ghi",
    title: "Video 3",
    description: "Description 3",
    processing_status: "COMPLETED",
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const VideosList = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {fakeVideos.map((video) => (
        <div
          key={video.id}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
        >
          <div className="bg-gray-200 h-48 flex items-center justify-center">
            <span className="text-gray-500">Thumbnail</span>
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
      ))}
    </div>
  );
};

export default VideosList;
