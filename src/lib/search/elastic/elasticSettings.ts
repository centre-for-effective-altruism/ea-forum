import "server-only";

export const getElasticCloudId = (): string => {
  const value = process.env.ELASTIC_CLOUD_ID;
  if (!value) {
    throw new Error("Elastic cloud ID not configured");
  }
  return value;
};

export const getElasticUsername = (): string => {
  const value = process.env.ELASTIC_USERNAME;
  if (!value) {
    throw new Error("Elastic username not configured");
  }
  return value;
};

export const getElasticPassword = (): string => {
  const value = process.env.ELASTIC_PASSWORD;
  if (!value) {
    throw new Error("Elastic password not configured");
  }
  return value;
};

/**
 * There a couple of places where we need a rough origin date
 * for scaling/faceting/etc. which is defined here. This needn't
 * be exact - just a date a little older than the oldest searchable
 * records.
 */
export const getElasticOriginDate = (): Date => {
  const value = process.env.ELASTIC_ORIGIN_DATE;
  if (!value) {
    throw new Error("Elastic origin date not configured");
  }
  return new Date(value);
};
