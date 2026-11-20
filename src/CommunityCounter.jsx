import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Eye } from 'lucide-react';

const API = import.meta.env.VITE_COUNTER_API_URL || 'https://traction-inverter-counter.xinzelee.workers.dev/v1/';
const PREFIX = 'traction-inverter-community-v1-';
const memory = {};

function read(key, session = false) {
  try { return (session ? sessionStorage : localStorage).getItem(PREFIX + key) || memory[key] || ''; }
  catch { return memory[key] || ''; }
}
function write(key, value, session = false) {
  memory[key] = String(value);
  try { (session ? sessionStorage : localStorage).setItem(PREFIX + key, String(value)); } catch { /* Keep the explorer usable. */ }
}
function token(key, session = false) {
  let value = read(key, session);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    write(key, value, session);
  }
  return value;
}
function validCounts(data) {
  return data && Number.isSafeInteger(data.visits) && data.visits >= 0 && Number.isSafeInteger(data.likes) && data.likes >= 0;
}
function cachedCounts() {
  try { const data = JSON.parse(read('counts')); return validCounts(data) ? data : null; } catch { return null; }
}
async function request(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(new URL(path, API.endsWith('/') ? API : `${API}/`), {
      method: body ? 'POST' : 'GET', cache: 'no-store', signal: controller.signal,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error('Counter unavailable');
    const result = await response.json();
    if (!validCounts(result)) throw new Error('Invalid counter response');
    write('counts', JSON.stringify(result));
    return result;
  } finally { clearTimeout(timeout); }
}

export default function CommunityCounter() {
  const [counts, setCounts] = useState(cachedCounts);
  const [live, setLive] = useState(false);
  const [liked, setLiked] = useState(() => read('liked') === '1');
  const [pending, setPending] = useState(() => Boolean(read('pending-like')));
  const busy = useRef(false);
  const mounted = useRef(false);

  const sync = useCallback(async () => {
    if (busy.current || !navigator.onLine) return;
    busy.current = true;
    try {
      let result;
      if (!read('visited', true)) {
        result = await request('visit', { token: token('visit-token', true) });
        write('visited', '1', true);
      } else result = await request('counts');
      const pendingToken = read('pending-like');
      if (pendingToken) {
        result = await request('like', { token: pendingToken });
        write('pending-like', '');
      }
      if (mounted.current) { setCounts(result); setLive(true); setPending(false); }
    } catch {
      if (mounted.current) { setCounts(cachedCounts()); setLive(false); setPending(Boolean(read('pending-like'))); }
    } finally { busy.current = false; }
  }, []);

  useEffect(() => {
    mounted.current = true;
    sync();
    const onOnline = () => sync();
    const onOffline = () => setLive(false);
    const onStorage = () => { setLiked(read('liked') === '1'); setPending(Boolean(read('pending-like'))); setCounts(cachedCounts()); };
    const interval = setInterval(() => { if (!document.hidden) sync(); }, 60000);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('storage', onStorage);
    return () => { mounted.current = false; clearInterval(interval); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.removeEventListener('storage', onStorage); };
  }, [sync]);

  const like = () => {
    if (read('liked') === '1') return;
    write('pending-like', token('like-token'));
    write('liked', '1');
    setLiked(true); setPending(true);
    // If another request is in flight, it will see the pending token before finishing.
    sync();
  };
  const suffix = counts && !live ? ' (saved)' : '';
  return <div className="community-counter" aria-label="Community activity">
    <span className="community-visits"><Eye size={14} aria-hidden="true"/>{counts ? `${counts.visits.toLocaleString()} visits${suffix}` : 'Visits unavailable'}</span>
    <button type="button" className="community-like" onClick={like} disabled={liked} aria-pressed={liked} aria-label={liked ? 'You liked this explorer' : 'Like this explorer'}><Heart size={14} fill={liked ? 'currentColor' : 'none'} aria-hidden="true"/><span>{counts ? `${counts.likes.toLocaleString()} likes${suffix}` : 'Like'}</span></button>
    {pending && <span className="community-status" role="status">Like saved; awaiting connection</span>}
  </div>;
}
