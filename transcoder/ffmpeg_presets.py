def get_dash_transcode_preset(input_path: str, output_dir: str) -> list[str]:
    """
    Returns FFmpeg command arguments for DASH transcoding with multiple resolutions.

    Args:
        input_path: Path to the input video file
        output_dir: Directory where output files will be saved

    Returns:
        List of command line arguments for subprocess.run()
    """
    command = ["ffmpeg", "-i", str(input_path)]
    command.extend(["-filter_complex", get_video_filter_complex()])

    # (label, stream_index, target_bitrate, max_bitrate, vbv_buffer)
    # maxrate = target × 1.1, bufsize = target × 2 — standard VBV settings
    video_streams = [
        ("360p",  0, "500k",  "550k",  "1000k"),
        ("720p",  1, "1500k", "1650k", "3000k"),
        ("1080p", 2, "3000k", "3300k", "6000k"),
    ]

    for stream_name, index, bitrate, maxrate, bufsize in video_streams:
        command.extend(get_video_stream_args(stream_name, index, bitrate, maxrate, bufsize))

    command.extend(get_audio_stream_args())
    command.extend(get_dash_output_args(output_dir))
    return command

def get_hls_transcode_preset(input_path: str, output_dir: str) -> list[str]:
    """
    Returns FFmpeg command arguments for HLS transcoding with multiple resolutions.

    Args:
        input_path: Path to the input video file
        output_dir: Directory where output files will be saved

    Returns:
        List of command line arguments for subprocess.run()
    """
    command = ["ffmpeg", "-i", str(input_path)]
    command.extend(["-filter_complex", get_video_filter_complex()])

    video_streams = [
        ("360p",  0, "500k",  "550k",  "1000k"),
        ("720p",  1, "1500k", "1650k", "3000k"),
        ("1080p", 2, "3000k", "3300k", "6000k"),
    ]

    for stream_name, index, bitrate, maxrate, bufsize in video_streams:
        command.extend(get_video_stream_args(stream_name, index, bitrate, maxrate, bufsize))

    command.extend(get_audio_stream_args())
    command.extend(get_hls_output_args(output_dir))
    return command

def get_dash_and_hls_transcode_preset(input_path: str, output_dir: str) -> list[str]:
    """
    Returns FFmpeg command arguments for both DASH and HLS transcoding in a single pass.

    Encoding once and muxing to both formats is more efficient than two separate runs,
    but requires careful stream mapping since DASH and HLS share the same encoded frames.

    Args:
        input_path: Path to the input video file
        output_dir: Directory where output files will be saved

    Returns:
        List of command line arguments for subprocess.run()
    """
    command = ["ffmpeg", "-i", input_path]
    command.extend(["-filter_complex", get_video_filter_complex()])

    video_streams = [
        ("360p",  0, "500k",  "550k",  "1000k"),
        ("720p",  1, "1500k", "1650k", "3000k"),
        ("1080p", 2, "3000k", "3300k", "6000k"),
    ]

    for stream_name, index, bitrate, maxrate, bufsize in video_streams:
        command.extend(get_video_stream_args(stream_name, index, bitrate, maxrate, bufsize))

    command.extend(get_audio_stream_args())

    # Both outputs share the encoded streams from above — no re-encoding occurs
    command.extend(get_dash_output_args(output_dir))
    command.extend(get_hls_output_args(output_dir))

    return command

def get_video_filter_complex() -> str:
    """Generate the filter complex string for video processing."""
    return (
        "[0:v]split=3[v1][v2][v3];"
        # setsar=1 forces square pixels to correct non-square SAR from source video
        "[v1]scale=640:360:flags=fast_bilinear,setsar=1[360p];"
        "[v2]scale=1280:720:flags=fast_bilinear,setsar=1[720p];"
        "[v3]scale=1920:1080:flags=fast_bilinear,setsar=1[1080p]"
    )

def get_video_stream_args(stream_name: str, index: int, bitrate: str, maxrate: str, bufsize: str) -> list[str]:
    """Generate FFmpeg arguments for a single video stream."""
    return [
        "-map", f"[{stream_name}]",
        f"-c:v:{index}", "libx264",
        f"-b:v:{index}", bitrate,
        f"-maxrate:v:{index}", maxrate,
        f"-bufsize:v:{index}", bufsize,
        "-preset", "veryfast",
        "-profile:v", "high",
        "-level:v", "4.1",
        # GOP must equal fps × seg_duration so segment boundaries align with keyframes.
        # Assuming 30fps and 2s segments: 30 × 2 = 60
        "-g", "60",
        "-keyint_min", "60",
        # Disable scene-cut detection to enforce fixed GOP size
        "-sc_threshold", "0",
    ]

def get_audio_stream_args() -> list[str]:
    """Generate FFmpeg arguments for the audio stream."""
    return [
        "-map", "0:a?",
        "-c:a", "aac",
        "-b:a", "128k"
    ]

def get_dash_output_args(output_dir: str) -> list[str]:
    """Generate FFmpeg arguments for DASH output."""
    return [
        "-use_timeline", "1",
        "-use_template", "1",
        # 2s segments: short enough for ABR to react quickly without excessive requests
        "-seg_duration", "2",
        "-dash_segment_type", "mp4",
        "-adaptation_sets", "id=0,streams=v id=1,streams=a",
        "-f", "dash",
        f"{output_dir}/manifest.mpd"
    ]

def get_hls_output_args(output_dir: str) -> list[str]:
    """Generate FFmpeg arguments for HLS output."""
    return [
        "-f", "hls",
        # Match seg_duration in DASH for consistency
        "-hls_time", "2",
        "-hls_playlist_type", "vod",
        "-hls_segment_type", "fmp4",
        "-hls_flags", "independent_segments",
        # Required to map all 3 video streams into separate variant playlists.
        # Without this, FFmpeg only writes a single quality to master.m3u8
        "-var_stream_map", "v:0 v:1 v:2",
        "-master_pl_name", "master.m3u8",
        f"{output_dir}/hls_%v.m3u8"
    ]
