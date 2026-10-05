import { useState } from 'react';
import { callsApi } from '../api';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Plays a private Connect recording via short-lived presigned URL.
 * No download controls; context menu disabled.
 */
export default function RecordingPlayer({ callId, hasRecordingKey, legacyUrl }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!callId && !legacyUrl) {
    return <span className="text-subtle text-sm">No recording</span>;
  }

  // Legacy public URL (demo / old integrations)
  if (!hasRecordingKey && legacyUrl) {
    return (
      <audio
        controls
        controlsList="nodownload noplaybackrate"
        className="h-8 max-w-[220px]"
        preload="none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src={legacyUrl} type="audio/mpeg" />
        <source src={legacyUrl} type="audio/wav" />
      </audio>
    );
  }

  if (!hasRecordingKey && !legacyUrl) {
    return <span className="text-subtle text-sm">Not available yet</span>;
  }

  const play = async () => {
    if (url) return;
    setLoading(true);
    setError('');
    try {
      const res = await callsApi.getRecording(callId);
      setUrl(res.data.data.url);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) setError('Not available yet');
      else setError(getApiErrorMessage(err, 'Could not load recording'));
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <span className="text-subtle text-sm">{error}</span>;
  }

  if (!url) {
    return (
      <button
        type="button"
        className="btn-secondary text-xs px-3 py-1.5"
        onClick={play}
        disabled={loading}
      >
        {loading ? 'Loading…' : 'Play'}
      </button>
    );
  }

  return (
    <audio
      controls
      autoPlay
      controlsList="nodownload noplaybackrate"
      className="h-8 max-w-[220px]"
      preload="none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <source src={url} type="audio/mpeg" />
      <source src={url} type="audio/wav" />
      <source src={url} type="audio/ogg" />
    </audio>
  );
}
