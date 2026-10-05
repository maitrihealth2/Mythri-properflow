/**
 * High-Availability Multi-Server Failover Pool Manager
 * Manages 5 production backend instances (1 Primary + 4 Fallback instances)
 * Automatically detects server downtime and provides zero-delay instant failover.
 */

export interface ServerInstance {
  url: string;
  isHealthy: boolean;
  failedAttempts: number;
  lastFailureTime?: number;
}

class ServerPoolManager {
  private servers: ServerInstance[] = [];
  private activeIndex: number = 0;
  private readonly failureCooldownMs = 30000; // 30 seconds before retrying a previously failed server

  constructor() {
    this.initializeServers();
  }

  /**
   * Initializes the 5 server URLs from environment variables or defaults.
   * Priority:
   * 1. NEXT_PUBLIC_API_SERVERS (comma-separated list of up to 5 URLs)
   * 2. NEXT_PUBLIC_API_URL (Primary) + NEXT_PUBLIC_API_URL_FALLBACK_1..4
   */
  private initializeServers(): void {
    const serverList: string[] = [];

    // Check comma-separated server list
    const envServers = process.env.NEXT_PUBLIC_API_SERVERS || process.env.NEXT_PUBLIC_API_URLS;
    if (envServers) {
      envServers.split(',').forEach(s => {
        const clean = s.trim().replace(/\/$/, "");
        if (clean && !serverList.includes(clean)) {
          serverList.push(clean);
        }
      });
    }

    // Check individual environment variables
    const primary = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, "");
    if (primary && !serverList.includes(primary)) {
      serverList.push(primary);
    }

    const fallbacks = [
      process.env.NEXT_PUBLIC_API_URL_FALLBACK_1,
      process.env.NEXT_PUBLIC_API_URL_FALLBACK_2,
      process.env.NEXT_PUBLIC_API_URL_FALLBACK_3,
      process.env.NEXT_PUBLIC_API_URL_FALLBACK_4,
    ];

    fallbacks.forEach(fb => {
      if (fb) {
        const clean = fb.trim().replace(/\/$/, "");
        if (clean && !serverList.includes(clean)) {
          serverList.push(clean);
        }
      }
    });

    // Fallback default if nothing configured
    if (serverList.length === 0) {
      serverList.push("http://localhost:8000");
    }

    this.servers = serverList.map(url => ({
      url,
      isHealthy: true,
      failedAttempts: 0,
    }));

    this.activeIndex = 0;
  }

  /**
   * Returns the list of all registered server instances.
   */
  public getAllServers(): string[] {
    return this.servers.map(s => s.url);
  }

  /**
   * Returns the current active server URL.
   */
  public getActiveUrl(): string {
    if (this.servers.length === 0) {
      return "http://localhost:8000";
    }
    
    // Check if current active server has recovered from cooldown
    const now = Date.now();
    const active = this.servers[this.activeIndex];
    
    if (!active.isHealthy && active.lastFailureTime && (now - active.lastFailureTime > this.failureCooldownMs)) {
      active.isHealthy = true;
      active.failedAttempts = 0;
    }

    return active.url;
  }

  /**
   * Instantly marks the current server as failed and rotates to the next available healthy server.
   * Returns the new active server URL.
   */
  public rotateToNextServer(reason?: string): string {
    if (this.servers.length <= 1) {
      return this.getActiveUrl();
    }

    const currentServer = this.servers[this.activeIndex];
    currentServer.isHealthy = false;
    currentServer.failedAttempts += 1;
    currentServer.lastFailureTime = Date.now();

    const previousIndex = this.activeIndex;
    
    // Find next server in pool
    let nextIndex = (this.activeIndex + 1) % this.servers.length;
    let found = false;
    const now = Date.now();

    for (let i = 0; i < this.servers.length; i++) {
      const candidate = this.servers[nextIndex];
      // Check if healthy or past cooldown
      if (candidate.isHealthy || (candidate.lastFailureTime && (now - candidate.lastFailureTime > this.failureCooldownMs))) {
        candidate.isHealthy = true;
        this.activeIndex = nextIndex;
        found = true;
        break;
      }
      nextIndex = (nextIndex + 1) % this.servers.length;
    }

    if (!found) {
      // If all servers are marked failed, reset all to healthy and take the next one
      this.servers.forEach(s => { s.isHealthy = true; s.failedAttempts = 0; });
      this.activeIndex = (previousIndex + 1) % this.servers.length;
    }

    const newUrl = this.servers[this.activeIndex].url;
    if (typeof window !== 'undefined') {
      console.warn(`[SERVER_FAILOVER] Switched from ${currentServer.url} to ${newUrl}. Reason: ${reason || 'Connection failure'}`);
    }
    return newUrl;
  }

  /**
   * Marks a server URL as explicitly healthy when a request succeeds.
   */
  public markHealthy(url?: string): void {
    const targetUrl = url || this.getActiveUrl();
    const server = this.servers.find(s => s.url === targetUrl);
    if (server) {
      server.isHealthy = true;
      server.failedAttempts = 0;
    }
  }

  /**
   * Converts a path or HTTP URL to a WebSocket URL using the active healthy server.
   */
  public getWebSocketUrl(path: string): string {
    const base = this.getActiveUrl();
    const wsBase = base.replace(/^https?:\/\//i, (match) => match.toLowerCase().startsWith('https') ? 'wss://' : 'ws://');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${wsBase}${cleanPath}`;
  }

  /**
   * High-availability fetch with automatic instant multi-server failover.
   */
  public async fetchWithFailover(
    endpointPath: string,
    init?: RequestInit,
    maxAttempts?: number
  ): Promise<Response> {
    const attemptsLimit = maxAttempts || Math.max(this.servers.length, 3);
    const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    let lastError: any = null;

    for (let attempt = 0; attempt < attemptsLimit; attempt++) {
      const currentBase = this.getActiveUrl();
      const targetUrl = endpointPath.startsWith('http://') || endpointPath.startsWith('https://') 
        ? endpointPath 
        : `${currentBase}${cleanPath}`;

      try {
        const response = await fetch(targetUrl, init);
        
        // 502, 503, 504 are server gateway/instance down codes
        if ([502, 503, 504].includes(response.status) && attempt < attemptsLimit - 1) {
          this.rotateToNextServer(`HTTP ${response.status}`);
          continue;
        }

        this.markHealthy(currentBase);
        return response;
      } catch (err: any) {
        lastError = err;
        // Network errors or connection refused
        if (attempt < attemptsLimit - 1) {
          this.rotateToNextServer(err?.message || 'Network fetch error');
          continue;
        }
      }
    }

    throw lastError || new Error(`All ${attemptsLimit} server failover attempts failed for ${endpointPath}`);
  }
}

export const serverPool = new ServerPoolManager();
export const getActiveApiUrl = () => serverPool.getActiveUrl();
export const getWebSocketUrl = (path: string) => serverPool.getWebSocketUrl(path);
export const fetchWithFailover = (path: string, init?: RequestInit) => serverPool.fetchWithFailover(path, init);
