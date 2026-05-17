import { initClient, tsRestFetchClient } from '@ts-rest/core';
import { contract } from '@memoir/contract';

export const api = initClient(contract, {
  baseUrl: '',
  baseHeaders: {},
  api: tsRestFetchClient,
});
