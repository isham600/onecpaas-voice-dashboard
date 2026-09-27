import { useEffect, useState } from "react";
import { Select } from "antd";
import { listFiles } from "../../../services/api";

// The user's File Hosting audio for the IVR builder's "Source" dropdowns.
// Values are file ids; the backend resolves them to URLs when the IVR runs.
export const useAudioFiles = (open) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    listFiles({ media_type: "audio", limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setOptions(
          (res?.data?.data || []).map((file) => ({
            value: file.id,
            title: file.media_name,
            label: file.duration_seconds ? `${file.media_name} (${file.duration_seconds}s)` : file.media_name,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return { options, loading };
};

export const titleOf = (options, id) => options.find((option) => option.value === id)?.title;

export const AudioSourceSelect = ({ options, loading, ...props }) => (
  <Select
    placeholder="Select an audio file"
    loading={loading}
    options={options}
    showSearch
    optionFilterProp="label"
    notFoundContent={
      loading ? (
        "Loading…"
      ) : (
        <span className="text-xs text-gray-500">
          No audio files yet. Upload one in File Hosting or from Send Voice.
        </span>
      )
    }
    {...props}
  />
);
