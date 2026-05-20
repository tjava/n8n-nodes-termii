import {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class TermiiApi implements ICredentialType {
  name = "termiiApi";

  displayName = "Termii API";

  icon = "file:termii.svg" as const;

  documentationUrl = "https://developer.termii.com/authentication";

  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.baseUrl}}",
      url: "/api/get-balance",
      qs: {
        api_key: "={{$credentials.apiKey}}",
      },
    },
  };

  properties: INodeProperties[] = [
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "",
      required: true,
      placeholder: "https://your-account-base-url",
      description:
        "Your Termii account base URL from the Termii dashboard. Termii's current docs say each account has its own base URL.",
    },
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: {
        password: true,
      },
      default: "",
      required: true,
      description:
        "Your Termii API key. You can find it in your Termii dashboard under Settings > API token.",
    },
  ];
}
