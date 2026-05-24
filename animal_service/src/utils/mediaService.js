const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  BatchGetCommand,
} = require("@aws-sdk/lib-dynamodb");
const dynamodb = require("../config/dynamodb");

const TABLE = process.env.DYNAMODB_TABLE || "rural_media";

async function createMediaRecord({ mediaId, animalId, originalKey, originalUrl, fileType, mimeType }) {
  const item = {
    mediaId,
    animalId,
    originalKey,
    originalUrl,
    fileType,
    mimeType,
    status: "processing",
    processedUrls: {},
    uploadedAt: new Date().toISOString(),
    processedAt: null,
    errorMessage: null,
  };

  await dynamodb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function getMediaRecord(mediaId) {
  const result = await dynamodb.send(
    new GetCommand({ TableName: TABLE, Key: { mediaId } })
  );
  return result.Item || null;
}

async function getMediaByIds(mediaIds) {
  if (!mediaIds || mediaIds.length === 0) return [];

  const results = [];
  const CHUNK = 100;

  for (let i = 0; i < mediaIds.length; i += CHUNK) {
    const chunk = mediaIds.slice(i, i + CHUNK);
    const keys = chunk.map((id) => ({ mediaId: id }));

    const response = await dynamodb.send(
      new BatchGetCommand({
        RequestItems: {
          [TABLE]: { Keys: keys },
        },
      })
    );

    const items = response.Responses?.[TABLE] || [];
    results.push(...items);
  }

  return results;
}

async function updateMediaStatus(mediaId, { status, processedUrls, processedAt, errorMessage }) {
  const updateExpression = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (status !== undefined) {
    updateExpression.push("#st = :st");
    expressionAttributeNames["#st"] = "status";
    expressionAttributeValues[":st"] = status;
  }
  if (processedUrls !== undefined) {
    updateExpression.push("processedUrls = :pu");
    expressionAttributeValues[":pu"] = processedUrls;
  }
  if (processedAt !== undefined) {
    updateExpression.push("processedAt = :pa");
    expressionAttributeValues[":pa"] = processedAt;
  }
  if (errorMessage !== undefined) {
    updateExpression.push("errorMessage = :em");
    expressionAttributeValues[":em"] = errorMessage;
  }

  if (updateExpression.length === 0) return;

  await dynamodb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { mediaId },
      UpdateExpression: "SET " + updateExpression.join(", "),
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length
        ? expressionAttributeNames
        : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );
}

module.exports = { createMediaRecord, getMediaRecord, getMediaByIds, updateMediaStatus };
