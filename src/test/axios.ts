import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export function makeAxiosResponse<T>(data: T, status = 200, statusText = 'OK'): AxiosResponse<T> {
  return {
    data,
    status,
    statusText,
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

export function makeAxiosError(
  status?: number,
  statusText = 'Error',
  requestData: unknown = {},
): AxiosError {
  const config = {} as InternalAxiosRequestConfig;
  if (status !== undefined) {
    return {
      config,
      response: makeAxiosResponse(requestData, status, statusText),
      isAxiosError: true,
      name: 'AxiosError',
      message: `Request failed with status code ${status}`,
      toJSON: () => ({}),
    } as AxiosError;
  }
  return {
    config,
    request: requestData,
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Network Error',
    toJSON: () => ({}),
  } as AxiosError;
}
