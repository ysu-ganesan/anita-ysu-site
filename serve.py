#!/usr/bin/env python3
"""Serve anita-site with caching OFF, so every reload shows the latest files.  python3 serve.py [port]

Also answers Range requests. Without them a browser cannot seek inside a video —
setting currentTime is silently ignored — so any page that starts a film part-way
in works on the real host and mysteriously does not work locally.
"""
import http.server, sys, os, re
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate'); self.send_header('Pragma', 'no-cache'); self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, *a): pass

    def send_head(self):
        rng = self.headers.get('Range')
        path = self.translate_path(self.path)
        if not rng or os.path.isdir(path) or not os.path.isfile(path):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)$', rng.strip())
        if not m:
            return super().send_head()
        size = os.path.getsize(path)
        start, end = m.group(1), m.group(2)
        if start == '':                       # suffix range: last N bytes
            length = min(int(end or 0), size)
            start, end = size - length, size - 1
        else:
            start = int(start)
            end = int(end) if end else size - 1
        if start >= size or start > end:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.end_headers()
            return None
        end = min(end, size - 1)
        f = open(path, 'rb'); f.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        self._range = (start, end)
        return f

    def copyfile(self, src, dst):
        r = getattr(self, '_range', None)
        if not r:
            return super().copyfile(src, dst)
        start, end = r
        self._range = None
        remaining = end - start + 1
        while remaining > 0:
            chunk = src.read(min(64 * 1024, remaining))
            if not chunk: break
            dst.write(chunk); remaining -= len(chunk)

H.extensions_map.update({'.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wav': 'audio/wav', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json'})
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
print(f'YSU site on http://127.0.0.1:{port}/  (no caching, ranges on)'); http.server.ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
