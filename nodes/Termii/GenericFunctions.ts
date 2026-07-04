import {
  IDataObject,
  IExecuteFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  JsonObject,
  NodeOperationError,
} from "n8n-workflow";

type TermiiCredential = {
  apiKey: string;
  baseUrl: string;
};

export type TermiiResponse =
  | JsonObject
  | JsonObject[]
  | string
  | number
  | boolean;

function buildUrlWithQueryString(url: string, qs: IDataObject): string {
  const searchParams = new URLSearchParams();

  Object.entries(qs).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, String(entry)));
      return;
    }

    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();

  if (!queryString) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

/**
 * Make an API request to Termii.
 */
export async function termiiApiRequest(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
  option: IDataObject = {},
): Promise<TermiiResponse> {
  const credentials = (await this.getCredentials(
    "termiiApi",
  )) as TermiiCredential;
  const baseUrl = credentials.baseUrl.trim().replace(/\/+$/, "");

  if (!baseUrl) {
    throw new NodeOperationError(
      this.getNode(),
      "Termii Base URL is required. Termii's current docs say your account base URL is available in the Termii dashboard.",
    );
  }

  const requestBody = { ...body };
  const queryString = { ...qs };

  if (method === "GET") {
    queryString.api_key = credentials.apiKey;
  } else {
    requestBody.api_key = credentials.apiKey;
  }

  const url = `${baseUrl}${endpoint}`;
  const options: IHttpRequestOptions = {
    method,
    url: method === "GET" ? buildUrlWithQueryString(url, queryString) : url,
    json: true,
  };

  if (method !== "GET") {
    options.body = requestBody;
    options.headers = {
      "Content-Type": "application/json",
    };
  }

  if (Object.keys(option).length !== 0) {
    Object.assign(options, option);
  }

  if (options.body && Object.keys(requestBody).length === 0) {
    delete options.body;
  }

  const response = (await this.helpers.httpRequest.call(
    this,
    options,
  )) as TermiiResponse;

  if (response === "") {
    throw new NodeOperationError(
      this.getNode(),
      `Termii returned an empty response for ${method} ${endpoint}. Check that the credential Base URL exactly matches the Base URL shown in your Termii dashboard, and that the API key belongs to that account.`,
    );
  }

  return response;
}

export function cleanObject(obj: IDataObject): IDataObject {
  const finalObj: IDataObject = {};

  Object.keys(obj).forEach((key) => {
    if (obj[key] !== "" && obj[key] !== undefined && obj[key] !== null) {
      finalObj[key] = obj[key];
    }
  });

  return finalObj;
}

export function normalizeTermiiResponse(
  response: TermiiResponse,
): JsonObject | JsonObject[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (typeof response === "object" && response !== null) {
    return response;
  }

  return { result: response };
}
