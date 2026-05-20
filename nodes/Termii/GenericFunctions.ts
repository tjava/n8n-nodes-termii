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
): Promise<JsonObject> {
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

  const options: IHttpRequestOptions = {
    method,
    url: `${baseUrl}${endpoint}`,
    body: requestBody,
    qs: queryString,
    headers: {
      "Content-Type": "application/json",
    },
    json: true,
  };

  if (Object.keys(option).length !== 0) {
    Object.assign(options, option);
  }

  if (Object.keys(requestBody).length === 0) {
    delete options.body;
  }

  if (Object.keys(queryString).length === 0) {
    delete options.qs;
  }

  return (await this.helpers.httpRequest.call(this, options)) as JsonObject;
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
  response: JsonObject | JsonObject[] | string | number | boolean,
): JsonObject | JsonObject[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (typeof response === "object" && response !== null) {
    return response;
  }

  return { result: response };
}
