import { ApiResponse } from '@rps/shared';

const API_VERSION = '1.0.0';

export function success<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    metadata: { timestamp: new Date().toISOString(), version: API_VERSION },
    error: null,
  };
}

export function fail(error: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    metadata: { timestamp: new Date().toISOString(), version: API_VERSION },
    error,
  };
}

