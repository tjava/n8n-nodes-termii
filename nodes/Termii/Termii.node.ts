import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  JsonObject,
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
} from "n8n-workflow";

import {
  cleanObject,
  normalizeTermiiResponse,
  termiiApiRequest,
  TermiiResponse,
} from "./GenericFunctions";

type PhoneNumberEntry = {
  phoneNumber?: string;
};

function getBulkPhoneNumbers(
  node: IExecuteFunctions,
  itemIndex: number,
): string[] {
  const entries = node.getNodeParameter(
    "phoneNumbers.values",
    itemIndex,
    [],
  ) as PhoneNumberEntry[];

  return entries
    .map((entry) => entry.phoneNumber?.trim())
    .filter((phoneNumber): phoneNumber is string => Boolean(phoneNumber));
}

export class Termii implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Termii",
    name: "termii",
    icon: "file:termii.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: "Send SMS, manage OTP tokens, and fetch Termii account data",
    defaults: {
      name: "Termii",
    },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: "termiiApi",
        required: true,
      },
    ],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        description: "The resource to perform operations on",
        options: [
          { name: "Account", value: "account" },
          { name: "Message", value: "message" },
          { name: "OTP / Token", value: "otp" },
          { name: "Sender ID", value: "senderId" },
        ],
        default: "message",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["message"],
          },
        },
        options: [
          {
            name: "Send Bulk SMS",
            value: "sendBulkSms",
            description: "Send an SMS message to multiple recipients",
            action: "Send bulk SMS",
          },
          {
            name: "Send SMS",
            value: "sendSms",
            description: "Send an SMS message to one recipient",
            action: "Send SMS",
          },
        ],
        default: "sendSms",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["otp"],
          },
        },
        options: [
          {
            name: "Send Token",
            value: "sendToken",
            description: "Send a Termii OTP token to a recipient",
            action: "Send token",
          },
          {
            name: "Verify Token",
            value: "verifyToken",
            description: "Verify a Termii OTP token",
            action: "Verify token",
          },
        ],
        default: "sendToken",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["account"],
          },
        },
        options: [
          {
            name: "Get Balance",
            value: "getBalance",
            description: "Get your Termii wallet balance",
            action: "Get balance",
          },
        ],
        default: "getBalance",
      },
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ["senderId"],
          },
        },
        options: [
          {
            name: "List Sender IDs",
            value: "listSenderIds",
            description: "List sender IDs associated with your Termii account",
            action: "List sender ids",
          },
        ],
        default: "listSenderIds",
      },
      {
        displayName: "To",
        name: "to",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendSms"],
          },
        },
        default: "",
        description:
          "Destination phone number in international format, for example 23490126727",
      },
      {
        displayName: "Phone Numbers",
        name: "phoneNumbers",
        type: "fixedCollection",
        required: true,
        typeOptions: {
          multipleValues: true,
          multipleValueButtonText: "Add Phone Number",
        },
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendBulkSms"],
          },
        },
        default: {},
        options: [
          {
            name: "values",
            displayName: "Phone Number",
            values: [
              {
                displayName: "Phone Number",
                name: "phoneNumber",
                type: "string",
                required: true,
                default: "",
                description:
                  "Recipient phone number in international format, for example 23490126727",
              },
            ],
          },
        ],
        description:
          "Phone numbers to send to. Termii documents a maximum of 100 numbers per bulk request.",
      },
      {
        displayName: "Sender ID",
        name: "from",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendSms", "sendBulkSms"],
          },
        },
        default: "",
        description:
          "Sender ID for SMS. Termii documents alphanumeric sender IDs as 3 to 11 characters.",
      },
      {
        displayName: "Message",
        name: "sms",
        type: "string",
        typeOptions: {
          rows: 4,
        },
        required: true,
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendSms", "sendBulkSms"],
          },
        },
        default: "",
        description: "Text message to deliver to the recipient",
      },
      {
        displayName: "Channel",
        name: "channel",
        type: "options",
        required: true,
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendSms", "sendBulkSms"],
          },
        },
        options: [
          {
            name: "DND",
            value: "dnd",
            description: "Transactional route that bypasses DND restrictions",
          },
          {
            name: "Generic",
            value: "generic",
            description: "Promotional route for numbers not on DND",
          },
        ],
        default: "generic",
        description: "Route through which the SMS is sent",
      },
      // TODO: Termii documents unicode and encrypted message types, but the current docs do not give exact request values or the encryption request fields. Keep the MVP to the documented plain examples.
      {
        displayName: "Type",
        name: "type",
        type: "options",
        required: true,
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendSms", "sendBulkSms"],
          },
        },
        options: [
          {
            name: "Plain",
            value: "plain",
            description: "Standard text message",
          },
        ],
        default: "plain",
        description: "Format of the SMS message",
      },
      {
        displayName: "PIN Type",
        name: "pinType",
        type: "options",
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        options: [
          {
            name: "Alphanumeric",
            value: "ALPHANUMERIC",
            description: "Generate an OTP containing letters and numbers",
          },
          {
            name: "Numeric",
            value: "NUMERIC",
            description: "Generate an OTP containing only numbers",
          },
        ],
        default: "NUMERIC",
        description: "Format of the OTP to generate and send",
      },
      // TODO: Termii's Send Token sample includes message_type, while the body params table omits its required status. It is exposed separately to preserve the documented request shape.
      {
        displayName: "Message Type",
        name: "messageType",
        type: "options",
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        options: [
          {
            name: "Alphanumeric",
            value: "ALPHANUMERIC",
          },
          {
            name: "Numeric",
            value: "NUMERIC",
          },
        ],
        default: "NUMERIC",
        description:
          "Value for Termii's documented message_type field in the Send Token sample request",
      },
      {
        displayName: "To",
        name: "otpTo",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        default: "",
        description:
          "Recipient phone number in international format, for example 2347065250817",
      },
      {
        displayName: "Sender ID",
        name: "otpFrom",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        default: "",
        description: "Approved Termii sender ID",
      },
      {
        displayName: "Channel",
        name: "otpChannel",
        type: "options",
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        options: [
          {
            name: "DND",
            value: "dnd",
            description: "Transactional route that bypasses DND restrictions",
          },
          {
            name: "Generic",
            value: "generic",
            description: "Promotional route for numbers not on DND",
          },
        ],
        default: "dnd",
        description: "Route through which the OTP message is sent",
      },
      {
        displayName: "PIN Attempts",
        name: "pinAttempts",
        type: "number",
        typeOptions: {
          minValue: 1,
        },
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        default: 3,
        description:
          "Number of times the PIN can be attempted before expiration. Minimum is one attempt.",
      },
      {
        displayName: "PIN Time to Live",
        name: "pinTimeToLive",
        type: "number",
        typeOptions: {
          minValue: 0,
          maxValue: 60,
        },
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        default: 1,
        description:
          "How long the PIN is valid before expiration, in minutes. Termii documents a minimum of 0 and maximum of 60.",
      },
      {
        displayName: "PIN Length",
        name: "pinLength",
        type: "number",
        typeOptions: {
          minValue: 4,
          maxValue: 8,
        },
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        default: 4,
        description:
          "Length of the PIN code. Termii documents a minimum of 4 and maximum of 8.",
      },
      {
        displayName: "PIN Placeholder",
        name: "pinPlaceholder",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        default: "",
        placeholder: "< 1234 >",
        description:
          "Placeholder in the message text that Termii replaces with the generated PIN",
      },
      {
        displayName: "Message Text",
        name: "messageText",
        type: "string",
        typeOptions: {
          rows: 4,
        },
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["sendToken"],
          },
        },
        default: "",
        description: "Message content to deliver to the recipient",
      },
      {
        displayName: "PIN ID",
        name: "pinId",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["verifyToken"],
          },
        },
        default: "",
        description: "ID of the PIN sent by Termii",
      },
      {
        displayName: "PIN",
        name: "pin",
        type: "string",
        required: true,
        displayOptions: {
          show: {
            resource: ["otp"],
            operation: ["verifyToken"],
          },
        },
        default: "",
        description: "PIN code to verify",
      },
    ],
    usableAsTool: true,
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter("resource", 0) as string;
    const operation = this.getNodeParameter("operation", 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        let responseData: TermiiResponse = {};

        if (resource === "message") {
          if (operation === "sendSms") {
            const body = cleanObject({
              to: this.getNodeParameter("to", i),
              from: this.getNodeParameter("from", i),
              sms: this.getNodeParameter("sms", i),
              type: this.getNodeParameter("type", i),
              channel: this.getNodeParameter("channel", i),
            });

            responseData = await termiiApiRequest.call(
              this,
              "POST",
              "/api/sms/send",
              body,
            );
          } else if (operation === "sendBulkSms") {
            const phoneNumbers = getBulkPhoneNumbers(this, i);

            if (phoneNumbers.length === 0) {
              throw new NodeOperationError(
                this.getNode(),
                "At least one phone number is required for bulk SMS.",
                { itemIndex: i },
              );
            }

            if (phoneNumbers.length > 100) {
              throw new NodeOperationError(
                this.getNode(),
                "Termii bulk SMS requests can include up to 100 phone numbers.",
                { itemIndex: i },
              );
            }

            const body = cleanObject({
              to: phoneNumbers,
              from: this.getNodeParameter("from", i),
              sms: this.getNodeParameter("sms", i),
              type: this.getNodeParameter("type", i),
              channel: this.getNodeParameter("channel", i),
            });

            responseData = await termiiApiRequest.call(
              this,
              "POST",
              "/api/sms/send/bulk",
              body,
            );
          }
        } else if (resource === "otp") {
          if (operation === "sendToken") {
            const body = cleanObject({
              message_type: this.getNodeParameter("messageType", i),
              to: this.getNodeParameter("otpTo", i),
              from: this.getNodeParameter("otpFrom", i),
              channel: this.getNodeParameter("otpChannel", i),
              pin_attempts: this.getNodeParameter("pinAttempts", i),
              pin_time_to_live: this.getNodeParameter("pinTimeToLive", i),
              pin_length: this.getNodeParameter("pinLength", i),
              pin_placeholder: this.getNodeParameter("pinPlaceholder", i),
              message_text: this.getNodeParameter("messageText", i),
              pin_type: this.getNodeParameter("pinType", i),
            });

            responseData = await termiiApiRequest.call(
              this,
              "POST",
              "/api/sms/otp/send",
              body,
            );
          } else if (operation === "verifyToken") {
            const body = cleanObject({
              pin_id: this.getNodeParameter("pinId", i),
              pin: this.getNodeParameter("pin", i),
            });

            responseData = await termiiApiRequest.call(
              this,
              "POST",
              "/api/sms/otp/verify",
              body,
            );
          }
        } else if (resource === "account") {
          if (operation === "getBalance") {
            responseData = await termiiApiRequest.call(
              this,
              "GET",
              "/api/get-balance",
            );
          }
        } else if (resource === "senderId") {
          if (operation === "listSenderIds") {
            responseData = await termiiApiRequest.call(
              this,
              "GET",
              "/api/sender-id",
            );
          }
        }

        const executionData = this.helpers
          .returnJsonArray(normalizeTermiiResponse(responseData))
          .map((data) => ({
            ...data,
            pairedItem: { item: i },
          }));
        returnData.push(...executionData);
      } catch (error) {
        if (this.continueOnFail()) {
          const message =
            error instanceof Error ? error.message : "Unknown Termii error";
          returnData.push({
            json: { error: message },
            pairedItem: { item: i },
          });
          continue;
        }
        if (error instanceof NodeOperationError) {
          throw new NodeOperationError(this.getNode(), error.message, {
            itemIndex: i,
          });
        }
        throw new NodeApiError(this.getNode(), error as JsonObject);
      }
    }

    return [returnData];
  }
}
