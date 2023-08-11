export interface WebSocketZrpcServer2Options {
  // Permit anonymous authentication.
  permitAnonymous?: boolean;

  // Maximum number of clients.
  maxConnections?: number;

  // Maximum number of inflight requests per-client.
  maxInflightRequestsPerClient?: number;
}
