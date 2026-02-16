import { useState, useCallback, useEffect } from 'react';
import type { IpcChannelMap, IpcChannel } from '../../shared/ipc-channels';

interface UseIpcQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useIpcQuery<C extends IpcChannel>(
  channel: C,
  params: IpcChannelMap[C]['params'],
  deps: unknown[] = [],
): UseIpcQueryResult<IpcChannelMap[C]['result']> {
  type Result = IpcChannelMap[C]['result'];
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.invoke(channel, params);
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [channel, JSON.stringify(params)]);

  useEffect(() => {
    fetch();
  }, [fetch, ...deps]);

  return { data, loading, error, refetch: fetch };
}

export function useIpcMutation<C extends IpcChannel>(
  channel: C,
): {
  mutate: (params: IpcChannelMap[C]['params']) => Promise<IpcChannelMap[C]['result']>;
  loading: boolean;
  error: string | null;
} {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (params: IpcChannelMap[C]['params']) => {
      setLoading(true);
      setError(null);
      try {
        const result = await window.electronAPI.invoke(channel, params);
        return result;
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [channel],
  );

  return { mutate, loading, error };
}
